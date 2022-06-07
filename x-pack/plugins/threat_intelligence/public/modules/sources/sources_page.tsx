/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, VFC } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { DefaultPageLayout } from '../../components/layout/layout';
import { SourcesTable } from './sources_table';

import { API_ROUTE_SOURCES } from '../../../common/constants';
import { useCore } from '../../context/core_start';
import { Feed } from '../../../common/types/Feed';

export const SourcesPage: VFC<RouteComponentProps> = () => {
  const { http, notifications } = useCore();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentAbortController, setAbortController] = useState<AbortController>();
  const [feeds, setFeeds] = useState<Feed[]>([]);

  const fetchSources = useCallback(async () => {
    const abortController = new AbortController();
    setAbortController(abortController);
    setIsLoading(true);
    try {
      const res = await http.get<Feed[]>(API_ROUTE_SOURCES, {
        signal: abortController.signal,
      });

      setFeeds(res as any);

      notifications.toasts.addSuccess('Data reloaded');
    } catch (e) {
      if (e?.name === 'AbortError') {
        notifications.toasts.addWarning({
          title: e.message,
        });
      } else {
        notifications.toasts.addDanger({
          title: 'Failed to run search',
          text: e.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [http, notifications.toasts]);

  useEffect(() => {
    return () => currentAbortController?.abort();
  }, [currentAbortController]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  return (
    <DefaultPageLayout pageTitle="Your data sources">
      <EuiSpacer size="m" />

      <EuiText>
        <p>
          This table shows indicators found/seen in your environment. Other indicators have been
          hidden.
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <SourcesTable isLoading={isLoading} items={feeds} />
    </DefaultPageLayout>
  );
};
