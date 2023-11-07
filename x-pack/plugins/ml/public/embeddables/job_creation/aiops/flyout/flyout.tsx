/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
// import type { Embeddable } from '@kbn/lens-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

// import { Layer } from './layer';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TimeRange } from '@kbn/es-query';
// import type { LayerResult } from '../../../../application/jobs/new_job/job_from_lens';
// import { VisualizationExtractor } from '../../../../application/jobs/new_job/job_from_lens';
// import { useMlFromLensKibanaContext } from '../../common/context';
import { CreateJob } from './create_job';

interface Props {
  dataView: DataView;
  field: DataViewField;
  query: QueryDslQueryContainer;
  timeRange: TimeRange;
  onClose: () => void;
}

export const CreateCategorizationJobFlyout: FC<Props> = ({
  onClose,
  dataView,
  field,
  query,
  timeRange,
}) => {
  // const {
  //   services: { data, lens },
  // } = useMlFromLensKibanaContext();

  // const [layerResults, setLayerResults] = useState<LayerResult[]>([]);

  // useEffect(() => {
  //   const visExtractor = new VisualizationExtractor();
  //   visExtractor
  //     .getResultLayersFromEmbeddable(embeddable, lens)
  //     .then(setLayerResults)
  //     .catch((error) => {
  //       // eslint-disable-next-line no-console
  //       console.error('Layers could not be extracted from embeddable', error);
  //       onClose();
  //     });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [data, lens, embeddable]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ml.embeddables.lensLayerFlyout.title"
              defaultMessage="Create anomaly detection job"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.lensLayerFlyout.secondTitle"
            defaultMessage="Create a categorization job for {field}"
            values={{ field: field.name }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <CreateJob dataView={dataView} field={field} query={query} timeRange={timeRange} />
        {/* {layerResults.map((layer, i) => (
          <Layer layer={layer} layerIndex={i} key={layer.id} embeddable={embeddable} />
        ))} */}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.embeddables.lensLayerFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
