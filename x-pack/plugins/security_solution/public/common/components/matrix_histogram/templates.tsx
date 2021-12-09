/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { TimeRange } from '../../../../../../../src/plugins/data/public';
import type { DataView } from '../../../../../../../src/plugins/data/common';
import { MatrixHistogramTemplate } from '../../../../common/types/matrix_histogram_templates';
import { MatrixHistogramTemplatesProps } from './types';
import { useFindTemplates } from '../../hooks/use_find_matrix_histogram_templates';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { useKibana } from '../../lib/kibana';

export const MatrixHistogramTemplates = ({
  from,
  to,
  inputsModelId = 'global',
}: MatrixHistogramTemplatesProps) => {
  const findTemplates = useFindTemplates();
  const [templates, setTemplates] = useState<MatrixHistogramTemplate[]>([]);
  const timerange = useMemo<TimeRange>(
    () => ({
      from,
      to,
      mode: 'absolute',
    }),
    [from, to]
  );

  const [defaultIndexPattern, setDefaultIndexPattern] = useState<DataView | null>(null);
  const { lens, data } = useKibana().services;
  const dispatch = useDispatch();

  const LensComponent = lens.EmbeddableComponent;

  useEffect(() => {
    const mount = async () => {
      const response = await findTemplates();
      const templatesWithIndexPattern =
        response.templates.length > 0
          ? response.templates.map((template) => {
              return {
                id: template.id,
                attributes: {
                  ...template.attributes,
                  references: template.references,
                },
              };
            })
          : [];
      setTemplates(templatesWithIndexPattern || []);
    };
    mount();
  }, [findTemplates]);

  useEffect(() => {
    const fetchIndexPattern = async () => {
      const fetchedDefaultIndexPattern = await data.dataViews.getDefault();

      setDefaultIndexPattern(fetchedDefaultIndexPattern);
    };
    fetchIndexPattern();
  }, [data.dataViews]);

  return templates && defaultIndexPattern?.isTimeBased() ? (
    <EuiFlexGroup>
      {templates.map((t) => (
        <EuiFlexItem style={{ height: 200 }}>
          <LensComponent
            id={t.id}
            key={t.id}
            withActions
            style={{ height: '100%' }}
            timeRange={timerange}
            attributes={t.attributes}
            // onLoad={(val) => {
            //   setIsLoading(val);
            // }}
            onBrushEnd={({ range }: { range: number[] }) => {
              dispatch(
                setAbsoluteRangeDatePicker({
                  id: inputsModelId,
                  from: new Date(range[0]).toISOString(),
                  to: new Date(range[1]).toISOString(),
                })
              );
            }}
            onFilter={
              (/* _data*/) => {
                // call back event for on filter event
              }
            }
            onTableRowClick={
              (/* _data*/) => {
                // call back event for on table row click event
              }
            }
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : null;
};
