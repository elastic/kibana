/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import uuid from 'uuid/v4';

import {
  EuiButtonEmpty,
  EuiTitle,
  EuiSpacer,
  EuiToolTip,
  EuiTextAlign,
  EuiCallOut,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { Join } from './resources/join';
import { ILayer } from '../../../classes/layers/layer';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { IField } from '../../../classes/fields/field';

interface Props {
  joins: JoinDescriptor[];
  layer: ILayer;
  layerDisplayName: string;
  leftJoinFields: IField[];
  onChange: (layer: ILayer, joins: JoinDescriptor[]) => void;
}

export function JoinEditor({ joins, layer, onChange, leftJoinFields, layerDisplayName }: Props) {
  const renderJoins = () => {
    return joins.map((joinDescriptor: JoinDescriptor, index: number) => {
      const handleOnChange = (updatedDescriptor: JoinDescriptor) => {
        onChange(layer, [...joins.slice(0, index), updatedDescriptor, ...joins.slice(index + 1)]);
      };

      const handleOnRemove = () => {
        onChange(layer, [...joins.slice(0, index), ...joins.slice(index + 1)]);
      };

      return (
        <Fragment key={index}>
          <EuiSpacer size="m" />
          <Join
            join={joinDescriptor}
            layer={layer}
            onChange={handleOnChange}
            onRemove={handleOnRemove}
            leftFields={leftJoinFields}
            leftSourceName={layerDisplayName}
          />
        </Fragment>
      );
    });
  };

  const addJoin = () => {
    onChange(layer, [
      ...joins,
      {
        right: {
          id: uuid(),
          applyGlobalQuery: true,
        },
      } as JoinDescriptor,
    ]);
  };

  const renderContent = () => {
    const disabledReason = layer.getJoinsDisabledReason();
    return disabledReason ? (
      <EuiCallOut color="warning">{disabledReason}</EuiCallOut>
    ) : (
      <Fragment>
        {renderJoins()}

        <EuiSpacer size="s" />

        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty
            onClick={addJoin}
            size="xs"
            iconType="plusInCircleFilled"
            aria-label={i18n.translate('xpack.maps.layerPanel.joinEditor.addJoinAriaLabel', {
              defaultMessage: 'Add join',
            })}
          >
            <FormattedMessage
              id="xpack.maps.layerPanel.joinEditor.addJoinButtonLabel"
              defaultMessage="Add join"
            />
          </EuiButtonEmpty>
        </EuiTextAlign>
      </Fragment>
    );
  };

  return (
    <div>
      <EuiTitle size="xs">
        <h5>
          <EuiToolTip
            content={i18n.translate('xpack.maps.layerPanel.joinEditor.termJoinTooltip', {
              defaultMessage:
                'Use term joins to augment this layer with properties for data driven styling.',
            })}
          >
            <FormattedMessage
              id="xpack.maps.layerPanel.joinEditor.termJoinsTitle"
              defaultMessage="Term joins"
            />
          </EuiToolTip>
        </h5>
      </EuiTitle>

      {renderContent()}
    </div>
  );
}
