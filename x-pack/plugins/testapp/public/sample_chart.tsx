/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiPanel, EuiText, EuiPageTemplate } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder/config_builder';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { LensConfig, LensConfigOptions } from '@kbn/lens-embeddable-utils/config_builder/types';

interface Props {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}

export function SampleChart({ lens, dataViews }: Props) {
  const [embeddableInput, setEmbeddableInput] = useState<TypedLensByValueInput | undefined>(
    undefined
  );

  const ref = useRef(false);

  const LensEmbeddableComponent = lens.EmbeddableComponent;

  const config: LensConfig = {
    chartType: 'metric',
    title: 'metric chart',
    layers: [
      {
        label: 'metric layer',
        dataset: {
          esql: 'from kibana_sample_data_ecommerce | stats count=count()',
        },
        value: 'count',
      },
    ],
  };

  const options: LensConfigOptions = {
    embeddable: true,
    timeRange: {
      from: 'now-30d',
      to: 'now',
      type: 'relative',
    },
  };

  useEffect(() => {
    ref.current = true;
    if (!embeddableInput) {
      lens.stateHelperApi().then((lensApi) => {
        const configBuilder = new LensConfigBuilder(lensApi.formula, dataViews);
        configBuilder.build(config, options).then((input) => {
          if (ref.current) {
            setEmbeddableInput(input as TypedLensByValueInput);
          }
        });
      });
    }
    return () => {
      ref.current = false;
    };
  });

  return (
    <>
      <EuiPageTemplate.Header pageTitle="Context menu" />
      <EuiPageTemplate.Section grow={false}>
        <>
          <EuiText>
            Sample chart is generated below, edit the `sample_chart.tsx` file to change it ....
          </EuiText>
          <EuiPanel data-test-subj="embeddedPanelExample" paddingSize="none" role="figure">
            {embeddableInput ? (
              <LensEmbeddableComponent
                {...embeddableInput}
                style={{
                  height: 240,
                }}
              />
            ) : (
              <EuiText>Loading...</EuiText>
            )}
          </EuiPanel>

          <EuiSpacer />
        </>
      </EuiPageTemplate.Section>
    </>
  );
}
