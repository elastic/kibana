/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';

import {
  EuiLink,
  EuiPanel,
  EuiStat,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RouteComponentProps } from 'react-router-dom';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DomainDeprecationDetails } from 'src/core/server/types';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import { useAppContext } from '../../app_context';

const i18nTexts = {
  statsTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.statsTitle', {
    defaultMessage: 'Kibana',
  }),
  totalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.totalDeprecationsTitle',
    {
      defaultMessage: 'Deprecations',
    }
  ),
  criticalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.criticalDeprecationsTitle',
    {
      defaultMessage: 'Critical',
    }
  ),
};

interface Props {
  history: RouteComponentProps['history'];
}

export const KibanaDeprecationStats: FunctionComponent<Props> = ({ history }) => {
  const { deprecations } = useAppContext();

  const [kibanaDeprecations, setKibanaDeprecations] = useState<
    DomainDeprecationDetails[] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    async function getAllDeprecations() {
      setIsLoading(true);

      try {
        const response = await deprecations.getAllDeprecations();
        setKibanaDeprecations(response);
      } catch (e) {
        setError(e);
      }

      setIsLoading(false);
    }

    getAllDeprecations();
  }, [deprecations]);

  return (
    <EuiPanel data-test-subj="kibanaStatsPanel">
      <EuiTitle size="s">
        <h3>
          <EuiLink
            {...reactRouterNavigate(history, '/kibana_deprecations')}
            data-test-subj="kibanaDeprecationsLink"
          >
            {i18nTexts.statsTitle}
          </EuiLink>
        </h3>
      </EuiTitle>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            data-test-subj="totalDeprecations"
            title={error ? '--' : kibanaDeprecations?.length ?? '0'}
            description={i18nTexts.totalDeprecationsTitle}
            isLoading={isLoading}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiStat
            data-test-subj="criticalDeprecations"
            title={
              kibanaDeprecations
                ? kibanaDeprecations.filter((deprecation) => deprecation.level === 'critical')
                    ?.length ?? '0'
                : '--'
            }
            description={i18nTexts.criticalDeprecationsTitle}
            titleColor="danger"
            isLoading={isLoading}
          >
            {/* {error && <EsStatsErrors error={error} />} */}
          </EuiStat>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
