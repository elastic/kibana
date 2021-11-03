/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import {
  EuiCard,
  EuiStat,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DomainDeprecationDetails } from 'kibana/public';
import { reactRouterNavigate } from '../../../../../../../../../src/plugins/kibana_react/public';
import { getDeprecationsUpperLimit } from '../../../../lib/utils';
import { useAppContext } from '../../../../app_context';
import { NoDeprecations } from '../no_deprecations';

const i18nTexts = {
  statsTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.statsTitle', {
    defaultMessage: 'Kibana',
  }),
  warningDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.warningDeprecationsTitle',
    {
      defaultMessage: 'Warning',
    }
  ),
  criticalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.criticalDeprecationsTitle',
    {
      defaultMessage: 'Critical',
    }
  ),
  loadingError: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.loadingErrorMessage',
    {
      defaultMessage: 'An error occurred while retrieving Kibana deprecations.',
    }
  ),
  loadingText: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.loadingText', {
    defaultMessage: 'Loading Kibana deprecation stats…',
  }),
  getCriticalDeprecationsMessage: (criticalDeprecations: number) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.criticalDeprecationsLabel', {
      defaultMessage:
        'Kibana has {criticalDeprecations} critical {criticalDeprecations, plural, one {deprecation} other {deprecations}}',
      values: {
        criticalDeprecations,
      },
    }),
  getWarningDeprecationsMessage: (warningDeprecations: number) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.getWarningDeprecationsMessage', {
      defaultMessage:
        'Kibana has {warningDeprecations} warning {warningDeprecations, plural, one {deprecation} other {deprecations}}',
      values: {
        warningDeprecations,
      },
    }),
};

export const KibanaDeprecationStats: FunctionComponent = () => {
  const history = useHistory();
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

  const warningDeprecationsCount =
    kibanaDeprecations?.filter((deprecation) => deprecation.level === 'warning')?.length ?? 0;
  const criticalDeprecationsCount =
    kibanaDeprecations?.filter((deprecation) => deprecation.level === 'critical')?.length ?? 0;

  const hasCritical = criticalDeprecationsCount > 0;
  const hasWarnings = warningDeprecationsCount > 0;
  const hasNoDeprecations = !isLoading && !error && !hasWarnings && !hasCritical;
  const shouldRenderStat = (forSection: boolean) => error || isLoading || forSection;

  return (
    <EuiCard
      data-test-subj="kibanaStatsPanel"
      layout="horizontal"
      title={
        <>
          {i18nTexts.statsTitle}
          {error && (
            <EuiIconTip
              type="alert"
              color="danger"
              size="m"
              content={i18nTexts.loadingError}
              anchorClassName="upgWarningIcon"
              iconProps={{
                'data-test-subj': 'kibanaRequestErrorIconTip',
              }}
            />
          )}
        </>
      }
      {...(!hasNoDeprecations && reactRouterNavigate(history, '/kibana_deprecations'))}
    >
      <EuiSpacer />
      <EuiFlexGroup>
        {hasNoDeprecations && (
          <EuiFlexItem>
            <NoDeprecations />
          </EuiFlexItem>
        )}

        {shouldRenderStat(hasCritical) && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj="criticalDeprecations"
              title={
                kibanaDeprecations ? getDeprecationsUpperLimit(criticalDeprecationsCount) : '--'
              }
              titleElement="span"
              description={i18nTexts.criticalDeprecationsTitle}
              titleColor="danger"
              isLoading={isLoading}
            >
              {error === undefined && (
                <EuiScreenReaderOnly>
                  <p>
                    {isLoading
                      ? i18nTexts.loadingText
                      : i18nTexts.getCriticalDeprecationsMessage(criticalDeprecationsCount)}
                  </p>
                </EuiScreenReaderOnly>
              )}
            </EuiStat>
          </EuiFlexItem>
        )}

        {shouldRenderStat(hasWarnings) && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj="warningDeprecations"
              title={error ? '--' : getDeprecationsUpperLimit(warningDeprecationsCount)}
              titleElement="span"
              description={i18nTexts.warningDeprecationsTitle}
              isLoading={isLoading}
            >
              {!error && (
                <EuiScreenReaderOnly>
                  <p>
                    {isLoading
                      ? i18nTexts.loadingText
                      : i18nTexts.getWarningDeprecationsMessage(warningDeprecationsCount)}
                  </p>
                </EuiScreenReaderOnly>
              )}
            </EuiStat>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCard>
  );
};
