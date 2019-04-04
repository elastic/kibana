/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiOverlayMask,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
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
  const suggestionCategoryMap = suggestions.reduce(
    (categoryMap, suggestion) => ({
      ...categoryMap,
      [suggestion.category]: [...(categoryMap[suggestion.category] || []), suggestion],
    }),
    {} as {
      [category: string]: Suggestion[];
    }
  );
  const [filter, setFilter] = useState<string | undefined>(undefined);

  return (
    <>
      <EuiOverlayMask>
        <EuiModal onClose={onClose} maxWidth={false} initialFocus="[name=popswitch]">
          <EuiModalBody>
            <EuiText>
              <h1>{title}</h1>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup className="visualizationModal">
              <EuiFlexItem grow={false}>
                <EuiFacetGroup style={{ maxWidth: 200 }}>
                  <EuiFacetButton
                    onClick={() => {
                      setFilter(undefined);
                    }}
                    buttonRef={null as any}
                    quantity={suggestions.length}
                    isSelected={!filter}
                  >
                    All Suggestions
                  </EuiFacetButton>
                  {Object.entries(suggestionCategoryMap).map(([category, categorySuggestions]) => (
                    <EuiFacetButton
                      key={category}
                      onClick={() => {
                        setFilter(category);
                      }}
                      buttonRef={null as any}
                      quantity={categorySuggestions.length}
                      isSelected={filter === category}
                    >
                      {category}
                    </EuiFacetButton>
                  ))}
                </EuiFacetGroup>
              </EuiFlexItem>
              <EuiFlexItem className="visualizationModal_suggestions">
                <EuiFlexGrid columns={3}>
                  {(filter ? suggestionCategoryMap[filter] : suggestions).map(suggestion => (
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
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
        </EuiModal>
      </EuiOverlayMask>
    </>
  );
}
