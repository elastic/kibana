/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiPanel,
} from '@elastic/eui';
import React from 'react';
import { Suggestion } from '../../../editor_plugin_registry';
import { ExpressionRenderer } from '../../../frame/expression_renderer';
import { VisModel } from '../../lib';

interface VisualizationModalProps {
  title: string;
  onClose: () => void;
  onSelect: (newVisModel: VisModel) => void;
  suggestions: Suggestion[];
  getInterpreter: () => Promise<{ interpreter: any }>;
  renderersRegistry: { get: (renderer: string) => any };
}

export function VisualizationModal({
  suggestions,
  title,
  onClose,
  onSelect,
  getInterpreter,
  renderersRegistry,
}: VisualizationModalProps) {
  return (
    <>
      <EuiOverlayMask>
        <EuiModal onClose={onClose} initialFocus="[name=popswitch]">
          <EuiModalHeader>
            <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiFlexGrid columns={3}>
              {suggestions.map(suggestion => (
                <EuiFlexItem key={suggestion.title}>
                  <EuiPanel onClick={() => onSelect(suggestion.visModel)} paddingSize="s">
                    {suggestion.title}
                    <ExpressionRenderer
                      getInterpreter={getInterpreter}
                      renderersRegistry={renderersRegistry}
                      expression={suggestion.previewExpression}
                      size="preview"
                    />
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton onClick={onClose}>Cancel</EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    </>
  );
}
