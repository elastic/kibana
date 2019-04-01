/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  // @ts-ignore
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import React from 'react';
import { Suggestion } from '../../../editor_plugin_registry';
import { VisModel } from '../../lib';

interface VisualizationModalProps {
  title: string;
  onClose: () => void;
  onSelect: (newVisModel: VisModel) => void;
  suggestions: Suggestion[];
}

export function VisualizationModal({
  suggestions,
  title,
  onClose,
  onSelect,
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
                  <EuiCard
                    key={suggestion.title}
                    onClick={() => onSelect(suggestion.visModel)}
                    icon={<EuiIcon size="xl" type={suggestion.iconType} />}
                    title={suggestion.title}
                    description=""
                  />
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
