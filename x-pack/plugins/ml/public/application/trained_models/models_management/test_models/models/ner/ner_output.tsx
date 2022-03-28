/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, ReactNode } from 'react';
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
import type { FormattedNerResp } from './ner_inference';

const ICON_PADDING = '2px';

export const NerOutput: FC<{ result: FormattedNerResp }> = ({ result }) => {
  const { euiTheme } = useCurrentEuiTheme();
  const lineSplit: JSX.Element[] = [];
  result.forEach(({ value, entity }) => {
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
                  : {entity.class_probability}
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
      color={getClassColor(euiTheme, entity.class_name)}
      style={{
        marginRight: ICON_PADDING,
        marginTop: `-${ICON_PADDING}`,
        border: `1px solid ${getClassColor(euiTheme, entity.class_name, true)}`,
        fontSize: euiTheme.euiFontSizeXS,
        padding: '0px 6px',
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
  switch (className) {
    case 'PER':
      return 'user';
    case 'LOC':
      return 'visMapCoordinate';

    default:
      return 'cross';
  }
}

function getClassLabel(className: string) {
  switch (className) {
    case 'PER':
      return 'Person';
    case 'LOC':
      return 'Location';

    default:
      return 'cross';
  }
}

function getClassColor(euiTheme: EuiThemeType, className: string, border: boolean = false) {
  switch (className) {
    case 'PER':
      return border ? euiTheme.euiColorVis5 : euiTheme.euiColorVis5_behindText;
    case 'LOC':
      return border ? euiTheme.euiColorVis1 : euiTheme.euiColorVis1_behindText;
    default:
      return border ? euiTheme.euiColorVis5 : euiTheme.euiColorVis5_behindText;
  }
}
