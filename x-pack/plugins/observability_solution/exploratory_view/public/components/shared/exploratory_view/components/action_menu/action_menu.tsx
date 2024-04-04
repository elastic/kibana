/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LensEmbeddableInput, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { EmbedAction } from '../../header/embed_action';
import { AddToCaseAction } from '../../header/add_to_case_action';
import { useKibana } from '../../hooks/use_kibana';

export function ExpViewActionMenuContent({
  timeRange,
  lensAttributes,
}: {
  timeRange?: { from: string; to: string };
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}) {
  const { lens, isDev } = useKibana().services;

  const [isSaveOpen, setIsSaveOpen] = useState(false);

  const LensSaveModalComponent = lens.SaveModalComponent;

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        style={{ paddingRight: 20 }}
      >
        {isDev && (
          <EuiFlexItem grow={false}>
            <EmbedAction lensAttributes={lensAttributes} />
          </EuiFlexItem>
        )}
        {timeRange && (
          <EuiFlexItem grow={false}>
            <AddToCaseAction lensAttributes={lensAttributes} timeRange={timeRange} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="o11yExpViewActionMenuContentOpenInLensButton"
            iconType="lensApp"
            fullWidth={false}
            isDisabled={!lens.canUseEditor() || lensAttributes === null}
            size="s"
            onClick={() => {
              if (lensAttributes) {
                lens.navigateToPrefilledEditor(
                  {
                    id: '',
                    timeRange,
                    attributes: lensAttributes,
                  },
                  {
                    openInNewTab: true,
                  }
                );
              }
            }}
          >
            {i18n.translate('xpack.exploratoryView.expView.heading.openInLens', {
              defaultMessage: 'Open in Lens',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="o11yExpViewActionMenuContentSaveButton"
            fill={true}
            iconType="save"
            fullWidth={false}
            isDisabled={!lens.canUseEditor() || lensAttributes === null}
            onClick={() => {
              if (lensAttributes) {
                setIsSaveOpen(true);
              }
            }}
            size="s"
          >
            {i18n.translate('xpack.exploratoryView.expView.heading.saveLensVisualization', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isSaveOpen && lensAttributes && (
        <LensSaveModalComponent
          initialInput={lensAttributes as unknown as LensEmbeddableInput}
          onClose={() => setIsSaveOpen(false)}
          // if we want to do anything after the viz is saved
          // right now there is no action, so an empty function
          onSave={() => {}}
        />
      )}
    </>
  );
}
