/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { useAppContext } from '../contexts/app_context';
import { checkForParseErrors } from '../lib';
import { ShardSerialized } from '../types';

interface Args {
  query: string;
  index: string;
}

interface ReturnValue {
  data: ShardSerialized[] | null;
  error?: string;
}

interface ProfileResponse {
  profile?: { shards: ShardSerialized[] };
  _shards: {
    failed: number;
    skipped: number;
    total: number;
    successful: number;
  };
}

const extractProfilerErrorMessage = (e: any): string | undefined => {
  if (e.body?.attributes?.error?.reason) {
    const { reason, line, col } = e.body.attributes.error;
    if (typeof line === 'number' && typeof col === 'number') {
      return `${reason} at line: ${line - 1} col: ${col}`;
    }
  }

  if (e.body?.message) {
    return e.body.message;
  }

  return;
};

export const useRequestProfile = () => {
  const { http, notifications, getLicenseStatus } = useAppContext();
  const licenseEnabled = getLicenseStatus().valid;
  return async ({ query, index }: Args): Promise<ReturnValue> => {
    if (!licenseEnabled) {
      return { data: null };
    }
    const { error, parsed } = checkForParseErrors(query);
    if (error) {
      notifications.addError(error, {
        title: i18n.translate('xpack.searchProfiler.errorToastTitle', {
          defaultMessage: 'JSON parse error',
        }),
      });
      return { data: null };
    }
    // Shortcut the network request if we have json with shards already...
    if (parsed.profile && parsed.profile.shards) {
      return { data: parsed.profile.shards };
    }

    const payload: Record<string, any> = { query: parsed };

    if (index == null || index === '') {
      payload.index = '_all';
    } else {
      payload.index = index;
    }

    try {
      const resp = await http.post<
        { ok: true; resp: ProfileResponse } | { ok: false; err: { msg: string } }
      >('../api/searchprofiler/profile', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) {
        return { data: null, error: resp.err.msg };
      }

      // If a user attempts to run Search Profiler without any indices,
      // _shards=0 and a "profile" output will not be returned
      if (resp.resp._shards.total === 0) {
        notifications.addDanger({
          'data-test-subj': 'noShardsNotification',
          title: i18n.translate('xpack.searchProfiler.errorNoShardsTitle', {
            defaultMessage: 'Unable to profile',
          }),
          text: i18n.translate('xpack.searchProfiler.errorNoShardsDescription', {
            defaultMessage: 'Verify your index input matches a valid index',
          }),
        });

        return { data: null };
      }

      return { data: resp.resp.profile!.shards };
    } catch (e) {
      const profilerErrorMessage = extractProfilerErrorMessage(e);
      if (profilerErrorMessage) {
        notifications.addError(e, {
          title: e.message,
          toastMessage: profilerErrorMessage,
        });
      } else {
        // Otherwise just report the original error
        notifications.addError(e, {
          title: i18n.translate('xpack.searchProfiler.errorSomethingWentWrongTitle', {
            defaultMessage: 'Something went wrong',
          }),
        });
      }
      return { data: null };
    }
  };
};
