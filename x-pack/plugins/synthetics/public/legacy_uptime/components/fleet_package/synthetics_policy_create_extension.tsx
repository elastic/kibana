/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DeprecateNoticeModal } from './deprecate_notice_modal';
import { PolicyConfig } from './types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';

export const defaultConfig: PolicyConfig = DEFAULT_FIELDS;

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate', delay: 15000 });

    const { application } = useKibana().services;

    const { package: pkg } = newPolicy;

    const onCancel = useCallback(() => {
      application?.navigateToApp('integrations', {
        path: `/detail/${pkg?.name}-${pkg?.version}/overview`,
      });
    }, [application, pkg?.name, pkg?.version]);
    return <DeprecateNoticeModal onCancel={onCancel} />;
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';
