/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { InvestigateWidget } from '@kbn/investigate-plugin/common';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiTitle,
} from '@elastic/eui';
import { InvestigateTextButton } from '../investigate_text_button';
import { DefaultEditWidgetForm } from './default_edit_widget_form';

export function EditWidgetFlyout({
  widget: initialWidget,
  onWidgetUpdate,
  onClose,
}: {
  widget: InvestigateWidget;
  onWidgetUpdate: (update: InvestigateWidget) => Promise<void>;
  onClose: () => void;
}) {
  const [widget, setWidget] = useState(initialWidget);

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [editedTitle, setEditedTitle] = useState(widget.title);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            {isEditingTitle ? (
              <EuiForm
                component="form"
                onSubmit={() => {
                  setWidget((prevWidget) => ({ ...prevWidget, title: editedTitle }));
                }}
              >
                <EuiFieldText
                  name="title"
                  data-test-subj="investigateAppGridItemFieldText"
                  value={editedTitle}
                  onChange={(event) => {
                    setEditedTitle(event.currentTarget.value);
                  }}
                  autoFocus
                />
              </EuiForm>
            ) : (
              <EuiTitle size="s">
                <h2>{widget.title}</h2>
              </EuiTitle>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InvestigateTextButton
              iconType={isEditingTitle ? 'check' : 'pencil'}
              onClick={() => {
                if (!isEditingTitle) {
                  setEditedTitle(widget.title);
                  setIsEditingTitle(() => true);
                } else {
                  setWidget((prevWidget) => ({ ...prevWidget, title: editedTitle }));
                  setIsEditingTitle(() => false);
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DefaultEditWidgetForm widget={widget} onWidgetUpdate={setWidget} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="investigateAppEditGridItemFlyoutCancelChangesButton"
            onClick={() => {
              onClose();
            }}
          >
            {i18n.translate('xpack.investigateApp.editGridItemFlyout.cancelChangesButtonLabel', {
              defaultMessage: 'Cancel changes',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="investigateAppEditGridItemFlyoutSaveChangesButton"
            color="primary"
            onClick={() => {
              onWidgetUpdate(widget);
            }}
            fill
          >
            {i18n.translate('xpack.investigateApp.editGridItemFlyout.saveChangesButtonLabel', {
              defaultMessage: 'Save changes',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
