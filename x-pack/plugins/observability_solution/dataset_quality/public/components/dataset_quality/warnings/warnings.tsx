/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useDatasetQualityWarnings } from '../../../hooks/use_dataset_quality_warnings';

const nonAggregatableWarningTitle = i18n.translate('xpack.datasetQuality.nonAggregatable.title', {
  defaultMessage: 'Your request may take longer to complete',
});

const nonAggregatableWarningDescription = (nonAggregatableDatasets: string[]) => (
  <FormattedMessage
    id="xpack.datasetQuality.nonAggregatable.description"
    defaultMessage="{description}"
    values={{
      description: (
        <FormattedMessage
          id="xpack.datasetQuality.nonAggregatable.warning"
          defaultMessage="Some of your datasets do not support _ignored aggregation and may cause delays when querying data. {howToFixIt} {showDatasets}"
          values={{
            showDatasets: (
              <FormattedMessage
                id="xpack.datasetQuality.nonAggregatable.warning.description."
                defaultMessage="{accordion}"
                values={{
                  accordion: (
                    <EuiAccordion
                      style={{ marginTop: '12px ' }}
                      buttonContent={i18n.translate(
                        'xpack.datasetQuality.nonAggregatable.showAffectedDatasets',
                        {
                          defaultMessage: 'Show affected datasets',
                        }
                      )}
                      id={''}
                    >
                      <ul>
                        {nonAggregatableDatasets.map((dataset) => (
                          <li key={dataset}>{dataset}</li>
                        ))}
                      </ul>
                    </EuiAccordion>
                  ),
                }}
              />
            ),
            howToFixIt: (
              <FormattedMessage
                id="xpack.datasetQuality.nonAggregatable.howToFixIt"
                defaultMessage="Manually {rolloverLink} these datasets to prevent future delays."
                values={{
                  rolloverLink: (
                    <EuiLink
                      external
                      target="_blank"
                      data-test-subj="datasetQualityNonAggregatableHowToFixItLink"
                      href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-rollover-index.html"
                    >
                      {i18n.translate('xpack.datasetQuality.nonAggregatableDatasets.link.title', {
                        defaultMessage: 'rollover',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            ),
          }}
        />
      ),
    }}
  />
);

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Warnings() {
  const { loading, nonAggregatableDatasets } = useDatasetQualityWarnings();

  return (
    <EuiFlexGroup data-test-subj="datasetQualityWarningsContainer" gutterSize="s" wrap>
      {!loading && nonAggregatableDatasets.length > 0 && (
        <EuiFlexItem>
          <EuiCallOut title={nonAggregatableWarningTitle} color="warning" iconType="warning">
            <p>{nonAggregatableWarningDescription(nonAggregatableDatasets)}</p>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
