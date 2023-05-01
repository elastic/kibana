/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiTextAlign, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Join } from './resources/join';
import { JoinDocumentationPopover } from './resources/join_documentation_popover';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';
import { AddJoinButton } from './add_join_button';

export interface JoinField {
  label: string;
  name: string;
}

export interface Props {
  joins: JoinDescriptor[];
  layer: IVectorLayer;
  layerDisplayName: string;
  leftJoinFields: JoinField[];
  onChange: (layer: IVectorLayer, joins: JoinDescriptor[]) => void;
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
        <Join
          key={joinDescriptor?.right?.id ?? index}
          join={joinDescriptor}
          onChange={handleOnChange}
          onRemove={handleOnRemove}
          leftFields={leftJoinFields}
          leftSourceName={layerDisplayName}
        />
      );
    });
  };

  const addJoin = (joinDescriptor: Partial<JoinDescriptor>) => {
    onChange(layer, [
      ...joins,
      {
        ...joinDescriptor,
        right: {
          id: uuidv4(),
          applyGlobalQuery: true,
          applyGlobalTime: true,
          ...(joinDescriptor?.right ?? {})
        }
      },
    ]);
  };

  function renderContent() {
    const disabledReason = layer.getJoinsDisabledReason();

    return disabledReason ? (
      <EuiCallOut color="warning">{disabledReason}</EuiCallOut>
    ) : (
      <>
        {renderJoins()}
        <EuiTextAlign textAlign="center">
          <AddJoinButton
            disabledReason={i18n.translate('xpack.maps.layerPanel.joinEditor.spatialJoin.addButtonDisabledReason', {
              defaultMessage: 'geojson',
            })}
            isDisabled={layer.getSource().isMvt()}
            label={i18n.translate('xpack.maps.layerPanel.joinEditor.spatialJoin.addButtonLabel', {
              defaultMessage: 'Add spatial join',
            })}
            onClick={() => {
              addJoin({
                leftField: '_id',
                right: {
                  type: SOURCE_TYPES.ES_DISTANCE_SOURCE,
                }
              })
            }}
          />
          <AddJoinButton
            disabledReason={i18n.translate('xpack.maps.layerPanel.joinEditor.termJoin.mvtSingleJoinMsg', {
              defaultMessage: `Vector tiles support one term join. To add multiple joins, select 'Limit results' in 'Scaling'.`,
            })}
            isDisabled={layer.getSource().isMvt() && joins.length >= 1}
            label={i18n.translate('xpack.maps.layerPanel.joinEditor.termJoin.addButtonLabel', {
              defaultMessage: 'Add term join',
            })}
            onClick={() => {
              addJoin({
                right: {
                  type: SOURCE_TYPES.ES_TERM_SOURCE,
                }
              })
            }}
          />
        </EuiTextAlign>
      </>
    );
  }

  return (
    <div>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.maps.layerPanel.joinEditor.title"
            defaultMessage="Joins"
          />{' '}
          <JoinDocumentationPopover />
        </h5>
      </EuiTitle>

      {renderContent()}
    </div>
  );
}
