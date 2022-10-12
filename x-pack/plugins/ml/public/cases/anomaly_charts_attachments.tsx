/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { memoize } from 'lodash';
import deepEqual from 'fast-deep-equal';

import { FormattedMessage } from '@kbn/i18n-react';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { EuiDescriptionList } from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { AnomalyChartsEmbeddableInput } from '../embeddables';

export const initComponent = memoize(
  (fieldFormats: FieldFormatsStart, EmbeddableComponent: FC<AnomalyChartsEmbeddableInput>) => {
    return React.memo(
      (props: PersistableStateAttachmentViewProps) => {
        const { persistableStateAttachmentState } = props;

        const dataFormatter = fieldFormats.deserialize({
          id: FIELD_FORMAT_IDS.DATE,
        });

        const inputProps =
          persistableStateAttachmentState as unknown as AnomalyChartsEmbeddableInput;

        const listItems = [
          {
            title: (
              <FormattedMessage
                id="xpack.ml.cases.anomalyCharts.description.jobIdsLabel"
                defaultMessage="Job IDs"
              />
            ),
            description: inputProps.jobIds.join(', '),
          },
          {
            title: (
              <FormattedMessage
                id="xpack.ml.cases.anomalyCharts.description.timeRangeLabel"
                defaultMessage="Time range"
              />
            ),
            description: `${dataFormatter.convert(
              inputProps.timeRange.from
            )} - ${dataFormatter.convert(inputProps.timeRange.to)}`,
          },
        ];

        if (typeof inputProps.query?.query === 'string' && inputProps.query?.query !== '') {
          listItems.push({
            title: (
              <FormattedMessage
                id="xpack.ml.cases.anomalySwimLane.description.queryLabel"
                defaultMessage="Query"
              />
            ),
            description: inputProps.query?.query,
          });
        }
        return (
          <>
            <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
            <EmbeddableComponent {...inputProps} />
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
