/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';
import { formatTimestampToDuration } from '../../../../common';

export const MIGRATION_STATUS_LABEL = i18n.translate(
  'xpack.monitoring.metricbeatMigration.migrationStatus',
  {
    defaultMessage: `Migration status`,
  }
);

export const MONITORING_STATUS_LABEL = i18n.translate(
  'xpack.monitoring.metricbeatMigration.monitoringStatus',
  {
    defaultMessage: `Monitoring status`,
  }
);

export function getSecurityStep(url) {
  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiCallOut
        color="warning"
        iconType="help"
        title={
          <EuiText>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.securitySetup"
              defaultMessage="If security is enabled, {link} might be required."
              values={{
                link: (
                  <Fragment>
                    {` `}
                    <EuiLink href={url} target="_blank">
                      <FormattedMessage
                        id="xpack.monitoring.metricbeatMigration.securitySetupLinkText"
                        defaultMessage="additional setup"
                      />
                    </EuiLink>
                  </Fragment>
                ),
              }}
            />
          </EuiText>
        }
      />
    </Fragment>
  );
}

export function getMigrationStatusStep(product) {
  if (product.isInternalCollector || product.isNetNewUser) {
    return {
      title: product.isNetNewUser ? MONITORING_STATUS_LABEL : MIGRATION_STATUS_LABEL,
      status: 'incomplete',
      children: (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate(
            'xpack.monitoring.metricbeatMigration.isInternalCollectorStatusTitle',
            {
              defaultMessage: `No monitoring data detected, but we’ll continue checking.`,
            }
          )}
        />
      ),
    };
  } else if (product.isPartiallyMigrated || product.isFullyMigrated) {
    return {
      title: MIGRATION_STATUS_LABEL,
      status: 'complete',
      children: (
        <EuiCallOut
          size="s"
          color="success"
          title={i18n.translate('xpack.monitoring.metricbeatMigration.fullyMigratedStatusTitle', {
            defaultMessage: 'Congratulations!',
          })}
        >
          <p>
            {i18n.translate('xpack.monitoring.metricbeatMigration.fullyMigratedStatusDescription', {
              defaultMessage: 'Metricbeat is shipping monitoring data.',
            })}
          </p>
        </EuiCallOut>
      ),
    };
  }

  return null;
}

export function getDisableStatusStep(product, meta) {
  if (!product || !product.isFullyMigrated) {
    let lastInternallyCollectedMessage = '';
    // It is possible that, during the migration steps, products are not reporting
    // monitoring data for a period of time outside the window of our server-side check
    // and this is most likely temporary so we want to be defensive and not error out
    // and hopefully wait for the next check and this state will be self-corrected.
    if (product) {
      const lastInternallyCollectedTimestamp =
        product.lastInternallyCollectedTimestamp || product.lastTimestamp;
      const secondsSinceLastInternalCollectionLabel = formatTimestampToDuration(
        lastInternallyCollectedTimestamp,
        CALCULATE_DURATION_SINCE
      );
      lastInternallyCollectedMessage = i18n.translate(
        'xpack.monitoring.metricbeatMigration.disableInternalCollection.partiallyMigratedStatusDescription',
        {
          defaultMessage: 'Last self monitoring was {secondsSinceLastInternalCollectionLabel} ago.',
          values: {
            secondsSinceLastInternalCollectionLabel,
          },
        }
      );
    }

    return {
      title: MIGRATION_STATUS_LABEL,
      status: 'incomplete',
      children: (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate(
            'xpack.monitoring.metricbeatMigration.partiallyMigratedStatusTitle',
            {
              defaultMessage: `Data is still coming from self monitoring`,
            }
          )}
        >
          <p>
            {i18n.translate(
              'xpack.monitoring.metricbeatMigration.partiallyMigratedStatusDescription',
              {
                defaultMessage: `It can take up to {secondsAgo} seconds to detect data.`,
                values: {
                  secondsAgo: meta.secondsAgo,
                },
              }
            )}
          </p>
          <p>{lastInternallyCollectedMessage}</p>
        </EuiCallOut>
      ),
    };
  }

  return {
    title: MIGRATION_STATUS_LABEL,
    status: 'complete',
    children: (
      <EuiCallOut
        size="s"
        color="success"
        title={i18n.translate(
          'xpack.monitoring.metricbeatMigration.disableInternalCollection.fullyMigratedStatusTitle',
          {
            defaultMessage: 'Congratulations!',
          }
        )}
      >
        <p>
          {i18n.translate(
            'xpack.monitoring.metricbeatMigration.disableInternalCollection.fullyMigratedStatusDescription',
            {
              defaultMessage:
                'We are not seeing any documents from self monitoring. Migration complete!',
            }
          )}
        </p>
      </EuiCallOut>
    ),
  };
}
