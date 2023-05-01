/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTitle, EuiTextAlign, EuiCallOut } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { Join } from './resources/join';
import { JoinDocumentationPopover } from './resources/join_documentation_popover';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';
import { AddTermJoinButton } from './add_term_join_button';

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
        ...joinDescriptor
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
          <AddTermJoinButton
            addJoin={addJoin}
            isLayerSourceMvt={layer.getSource().isMvt()}
            numJoins={joins.length}
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
