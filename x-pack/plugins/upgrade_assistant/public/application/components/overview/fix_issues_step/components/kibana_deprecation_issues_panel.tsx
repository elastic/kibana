/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DomainDeprecationDetails } from '@kbn/core/public';

import { useAppContext } from '../../../../app_context';
import { DeprecationIssuesPanel } from './deprecation_issues_panel';

interface Props {
  setIsFixed: (isFixed: boolean) => void;
}

export const KibanaDeprecationIssuesPanel: FunctionComponent<Props> = ({ setIsFixed }) => {
  const {
    services: {
      core: { deprecations },
    },
  } = useAppContext();

  const [kibanaDeprecations, setKibanaDeprecations] = useState<
    DomainDeprecationDetails[] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    async function getAllDeprecations() {
      setIsLoading(true);

      try {
        const response = await deprecations.getAllDeprecations();
        if (isMounted) setKibanaDeprecations(response);
      } catch (e) {
        if (isMounted) setError(e);
      }

      if (isMounted) setIsLoading(false);
    }

    getAllDeprecations();

    return () => {
      setIsLoading(false);
      isMounted = false;
    };
  }, [deprecations]);

  const criticalDeprecationsCount =
    kibanaDeprecations?.filter((deprecation) => deprecation.level === 'critical')?.length ?? 0;

  const warningDeprecationsCount =
    kibanaDeprecations?.filter((deprecation) => deprecation.level === 'warning')?.length ?? 0;

  const errorMessage =
    error &&
    i18n.translate('xpack.upgradeAssistant.deprecationStats.loadingErrorMessage', {
      defaultMessage: 'Could not retrieve Kibana deprecation issues.',
    });

  return (
    <DeprecationIssuesPanel
      data-test-subj="kibanaStatsPanel"
      deprecationSource="Kibana"
      linkUrl="/kibana_deprecations"
      criticalDeprecationsCount={criticalDeprecationsCount}
      warningDeprecationsCount={warningDeprecationsCount}
      isLoading={isLoading}
      errorMessage={errorMessage}
      setIsFixed={setIsFixed}
    />
  );
};
