/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiAccordion, EuiBadge, EuiCallOut, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AnnotationsTable } from '../../components/annotations/annotations_table';

interface Props {
  chartDetails: any;
  detectors: any;
  focusAnnotationData: any;
  focusAnnotationError: any;
  selectedDetectorIndex: number;
  selectedJobId: string;
}

export const TimeSeriesExplorerAnnotationsTable: FC<Props> = ({
  chartDetails,
  detectors,
  focusAnnotationData,
  focusAnnotationError,
  selectedDetectorIndex,
  selectedJobId,
}) => {
  return (
    <>
      {focusAnnotationError !== undefined && (
        <>
          <EuiTitle data-test-subj="mlAnomalyExplorerAnnotations error" size={'xs'}>
            <h2>
              <FormattedMessage
                id="xpack.ml.timeSeriesExplorer.annotationsErrorTitle"
                defaultMessage="Annotations"
              />
            </h2>
          </EuiTitle>
          <EuiPanel>
            <EuiCallOut
              title={i18n.translate('xpack.ml.timeSeriesExplorer.annotationsErrorCallOutTitle', {
                defaultMessage: 'An error occurred loading annotations:',
              })}
              color="danger"
              iconType="warning"
            >
              <p>{focusAnnotationError}</p>
            </EuiCallOut>
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}
      {focusAnnotationData && focusAnnotationData.length > 0 && (
        <>
          <EuiAccordion
            id={'mlAnnotationsAccordion'}
            buttonContent={
              <EuiTitle size={'xs'}>
                <h2>
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.annotationsTitle"
                    defaultMessage="Annotations {badge}"
                    values={{
                      badge: (
                        <EuiBadge color={'hollow'}>
                          <FormattedMessage
                            id="xpack.ml.explorer.annotationsTitleTotalCount"
                            defaultMessage="Total: {count}"
                            values={{ count: focusAnnotationData.length }}
                          />
                        </EuiBadge>
                      ),
                    }}
                  />
                </h2>
              </EuiTitle>
            }
            data-test-subj="mlAnomalyExplorerAnnotations loaded"
          >
            <AnnotationsTable
              chartDetails={chartDetails}
              detectorIndex={selectedDetectorIndex}
              detectors={detectors}
              jobIds={[selectedJobId]}
              annotations={focusAnnotationData}
              isSingleMetricViewerLinkVisible={false}
              isNumberBadgeVisible={true}
            />
          </EuiAccordion>
          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
};
