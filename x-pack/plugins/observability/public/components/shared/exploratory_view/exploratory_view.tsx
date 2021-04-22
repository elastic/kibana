/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { ExploratoryViewHeader } from './header/header';
import { useUrlStorage } from './hooks/use_url_storage';
import { useLensAttributes } from './hooks/use_lens_attributes';
import { EmptyView } from './components/empty_view';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { useAppIndexPatternContext } from './hooks/use_app_index_pattern';
import { ReportToDataTypeMap } from './configurations/constants';
import { SeriesBuilder } from './series_builder/series_builder';

export function ExploratoryView() {
  const {
    services: { lens },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes'] | null>(
    null
  );

  const { loadIndexPattern, loading } = useAppIndexPatternContext();

  const LensComponent = lens?.EmbeddableComponent;

  const { firstSeriesId: seriesId, firstSeries: series } = useUrlStorage();

  const lensAttributesT = useLensAttributes({
    seriesId,
  });

  useEffect(() => {
    if (series?.reportType || series?.dataType) {
      loadIndexPattern({ dataType: series?.dataType ?? ReportToDataTypeMap[series?.reportType] });
    }
  }, [series?.reportType, series?.dataType, loadIndexPattern]);

  useEffect(() => {
    setLensAttributes(lensAttributesT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lensAttributesT ?? {}), series?.reportType, series?.time?.from]);

  return (
    <Wrapper>
      {lens ? (
        <>
          <ExploratoryViewHeader lensAttributes={lensAttributes} seriesId={seriesId} />
          {lensAttributes && seriesId && series?.reportType && series?.time ? (
            <LensComponent
              id="exploratoryView"
              style={{ height: 550 }}
              timeRange={series?.time}
              attributes={lensAttributes}
            />
          ) : (
            <EmptyView loading={loading} />
          )}
          <SeriesBuilder seriesId={seriesId} />
        </>
      ) : (
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.observability.overview.exploratoryView.lensDisabled', {
              defaultMessage:
                'Lens app is not available, please enable Lens to use exploratory view.',
            })}
          </h2>
        </EuiTitle>
      )}
    </Wrapper>
  );
}

const Wrapper = styled(EuiPanel)`
  max-width: 1800px;
  min-width: 800px;
  margin: 0 auto;
  width: 100%;
`;
