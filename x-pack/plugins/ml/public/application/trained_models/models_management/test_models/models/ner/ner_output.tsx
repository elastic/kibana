/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, ReactNode } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiHorizontalRule,
  EuiBadge,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';

import {
  useCurrentEuiTheme,
  EuiThemeType,
} from '../../../../../components/color_range_legend/use_color_range';
import type { NerInference } from './ner_inference';

const ICON_PADDING = '2px';
const PROBABILITY_SIG_FIGS = 3;

const ENTITY_TYPES = {
  PER: {
    label: 'Person',
    icon: 'user',
    color: 'euiColorVis5_behindText',
    borderColor: 'euiColorVis5',
  },
  LOC: {
    label: 'Location',
    icon: 'visMapCoordinate',
    color: 'euiColorVis1_behindText',
    borderColor: 'euiColorVis1',
  },
  ORG: {
    label: 'Organization',
    icon: 'home',
    color: 'euiColorVis0_behindText',
    borderColor: 'euiColorVis0',
  },
  MISC: {
    label: 'Miscellaneous',
    icon: 'questionInCircle',
    color: 'euiColorVis7_behindText',
    borderColor: 'euiColorVis7',
  },
};

const UNKNOWN_ENTITY_TYPE = {
  label: '',
  icon: 'questionInCircle',
  color: 'euiColorVis5_behindText',
  borderColor: 'euiColorVis5',
};

export const getNerOutputComponent = (inferrer: NerInference) => <NerOutput inferrer={inferrer} />;

const NerOutput: FC<{ inferrer: NerInference }> = ({ inferrer }) => {
  const { euiTheme } = useCurrentEuiTheme();
  const result = useObservable(inferrer.inferenceResult$);

  if (!result) {
    return null;
  }

  const lineSplit: JSX.Element[] = [];
  result.response.forEach(({ value, entity }) => {
    if (entity === null) {
      const lines = value
        .split(/(\n)/)
        .map((line) => (line === '\n' ? <br /> : <span>{line}</span>));

      lineSplit.push(...lines);
    } else {
      lineSplit.push(
        <EuiToolTip
          position="top"
          content={
            <div>
              <div>
                <EuiIcon
                  size="m"
                  type={getClassIcon(entity.class_name)}
                  style={{ marginRight: ICON_PADDING, verticalAlign: 'text-top' }}
                />
                {value}
              </div>
              <EuiHorizontalRule margin="none" />
              <div style={{ fontSize: euiTheme.euiFontSizeXS, marginTop: ICON_PADDING }}>
                <div>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.testModelsFlyout.ner.output.typeTitle"
                    defaultMessage="Type"
                  />
                  : {getClassLabel(entity.class_name)}
                </div>
                <div>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.testModelsFlyout.ner.output.probabilityTitle"
                    defaultMessage="Probability"
                  />
                  : {Number(entity.class_probability).toPrecision(PROBABILITY_SIG_FIGS)}
                </div>
              </div>
            </div>
          }
        >
          <EntityBadge entity={entity}>{value}</EntityBadge>
        </EuiToolTip>
      );
    }
  });
  return <div style={{ lineHeight: '24px' }}>{lineSplit}</div>;
};

const EntityBadge = ({
  entity,
  children,
}: {
  entity: estypes.MlTrainedModelEntities;
  children: ReactNode;
}) => {
  const { euiTheme } = useCurrentEuiTheme();
  return (
    <EuiBadge
      // @ts-expect-error colors are correct in ENTITY_TYPES
      color={getClassColor(euiTheme, entity.class_name)}
      style={{
        marginRight: ICON_PADDING,
        marginTop: `-${ICON_PADDING}`,
        border: `1px solid ${getClassColor(euiTheme, entity.class_name, true)}`,
        fontSize: euiTheme.euiFontSizeXS,
        padding: '0px 6px',
        pointerEvents: 'none',
      }}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiIcon
            size="s"
            type={getClassIcon(entity.class_name)}
            style={{ marginRight: ICON_PADDING, marginTop: ICON_PADDING }}
          />
        </EuiFlexItem>
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
};

function getClassIcon(className: string) {
  const entity = ENTITY_TYPES[className as keyof typeof ENTITY_TYPES];
  return entity?.icon ?? UNKNOWN_ENTITY_TYPE.icon;
}

function getClassLabel(className: string) {
  const entity = ENTITY_TYPES[className as keyof typeof ENTITY_TYPES];
  return entity?.label ?? className;
}

function getClassColor(euiTheme: EuiThemeType, className: string, border: boolean = false) {
  const entity = ENTITY_TYPES[className as keyof typeof ENTITY_TYPES];
  let color = entity?.color ?? UNKNOWN_ENTITY_TYPE.color;
  if (border) {
    color = entity?.borderColor ?? UNKNOWN_ENTITY_TYPE.borderColor;
  }
  return euiTheme[color as keyof typeof euiTheme];
}
