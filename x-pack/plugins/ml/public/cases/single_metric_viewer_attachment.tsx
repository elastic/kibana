/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList } from '@elastic/eui';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import moment from 'moment';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { memoize } from 'lodash';
import React from 'react';
import type { SingleMetricViewerEmbeddableState } from '../embeddables/types';
import type { SingleMetricViewerSharedComponent } from '../shared_components/single_metric_viewer';

export const initComponent = memoize(
  (
    fieldFormats: FieldFormatsStart,
    SingleMetricViewerComponent: SingleMetricViewerSharedComponent
  ) => {
    return React.memo(
      (props: PersistableStateAttachmentViewProps) => {
        const { persistableStateAttachmentState, caseData } = props;

        const inputProps =
          persistableStateAttachmentState as unknown as SingleMetricViewerEmbeddableState;

        const dataFormatter = fieldFormats.deserialize({
          id: FIELD_FORMAT_IDS.DATE,
        });

        const listItems = [
          {
            title: (
              <FormattedMessage
                id="xpack.ml.cases.singleMetricViewer.description.jobIdLabel"
                defaultMessage="Job ID"
              />
            ),
            description: inputProps.jobIds.join(', '),
          },
          {
            title: (
              <FormattedMessage
                id="xpack.ml.cases.singleMetricViewer.description.timeRangeLabel"
                defaultMessage="Time range"
              />
            ),
            description: `${dataFormatter.convert(
              inputProps.timeRange!.from
            )} - ${dataFormatter.convert(inputProps.timeRange!.to)}`,
          },
        ];

        if (typeof inputProps.query?.query === 'string' && inputProps.query?.query !== '') {
          listItems.push({
            title: (
              <FormattedMessage
                id="xpack.ml.cases.singleMetricViewer.description.queryLabel"
                defaultMessage="Query"
              />
            ),
            description: inputProps.query?.query,
          });
        }

        const { jobIds, timeRange, ...rest } = inputProps;
        const selectedJobId = jobIds[0];

        return (
          <>
            <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
            <SingleMetricViewerComponent
              bounds={{ min: moment(timeRange!.from), max: moment(timeRange!.to) }}
              lastRefresh={Date.now()}
              selectedJobId={selectedJobId}
              uuid={caseData.id}
              {...rest}
            />
          </>
        );
      },
      (prevProps, nextProps) =>
        deepEqual(
          prevProps.persistableStateAttachmentState,
          nextProps.persistableStateAttachmentState
        )
    );
  }
);
