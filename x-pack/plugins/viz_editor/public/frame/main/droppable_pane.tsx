/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { getTopSuggestion, VisModel } from '../../common';
import { Draggable } from '../../common/components/draggable';
import { VisualizationModal } from '../../common/components/visualization_modal';
import { GetSuggestionsType, Suggestion } from '../../editor_plugin_registry';

interface ModalProps {
  visModel: VisModel;
  children: any;
  getSuggestionsForField: GetSuggestionsType<VisModel<any, any>>;
  onChangeVisModel: (newState: VisModel) => void;
  getInterpreter: () => Promise<{ interpreter: any }>;
  renderersRegistry: { get: (renderer: string) => any };
  useFirstSuggestion?: boolean;
}

export function DroppablePane({
  visModel,
  getSuggestionsForField,
  onChangeVisModel,
  children,
  renderersRegistry,
  getInterpreter,
  useFirstSuggestion,
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
      isBlock
      canHandleDrop={(field: any) => !!field && !!field.type}
      onDrop={(field: any) => {
        const { datasource } = visModel;
        if (!datasource) {
          return;
        }
        const suggestions = getSuggestionsForField(datasource.id, field, visModel);
        if (useFirstSuggestion) {
          onChangeVisModel(getTopSuggestion(suggestions).visModel);
        } else {
          setState({
            isOpen: true,
            fieldName: field.name,
            suggestions,
          });
        }
      }}
    >
      {children}
      {state.isOpen ? (
        <VisualizationModal
          renderersRegistry={renderersRegistry}
          getInterpreter={getInterpreter}
          title={`How do you want to use ${state.fieldName}?`}
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
