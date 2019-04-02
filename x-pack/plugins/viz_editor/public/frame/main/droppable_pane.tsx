/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { VisModel } from '../../common';
import { Draggable } from '../../common/components/draggable';
import { VisualizationModal } from '../../common/components/visualization_modal';
import { GetSuggestionsType, Suggestion } from '../../editor_plugin_registry';

interface ModalProps {
  visModel: VisModel;
  children: any;
  getAllSuggestionsForField: GetSuggestionsType<VisModel<any, any>>;
  onChangeVisModel: (newState: VisModel) => void;
}

export function DroppablePane({
  visModel,
  getAllSuggestionsForField,
  onChangeVisModel,
  children,
}: ModalProps) {
  // tslint:disable-next-line:no-shadowed-variable
  const initialState = {
    isOpen: false,
    suggestions: [] as Suggestion[],
    fieldName: '',
  };
  const [state, setState] = useState(initialState);
  const closeModal = () => setState(initialState);

  return (
    <Draggable
      className="euiPanel euiPanel--paddingLarge euiPageContent"
      canHandleDrop={(field: any) => !!field && !!field.type}
      onDrop={(field: any) => {
        const { datasource } = visModel;
        if (!datasource) {
          return;
        }
        const suggestions = getAllSuggestionsForField(datasource.id, field, visModel);
        setState({
          isOpen: true,
          fieldName: field.name,
          suggestions,
        });
      }}
    >
      {children}
      {state.isOpen ? (
        <VisualizationModal
          title={`Suggested visualizations for ${state.fieldName}`}
          suggestions={state.suggestions}
          onClose={() => closeModal()}
          onSelect={newVisModel => {
            closeModal();
            onChangeVisModel(newVisModel);
          }}
        />
      ) : (
        ''
      )}
    </Draggable>
  );
}
