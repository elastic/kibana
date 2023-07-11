/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiLink, EuiTextColor } from '@elastic/eui';
import classNames from 'classnames';
import { DropIllustration } from '@kbn/chart-icons';

export const DragDropPrompt = ({ expressionExists }: { expressionExists?: boolean }) => {
  return (
    <EuiText
      className={classNames('lnsWorkspacePanel__emptyContent')}
      textAlign="center"
      data-test-subj="workspace-drag-drop-prompt"
      size="s"
    >
      <div>
        <DropIllustration
          aria-hidden={true}
          className="lnsWorkspacePanel__promptIllustration lnsWorkspacePanel__dropIllustration"
        />
        <h2>
          <strong>
            {!expressionExists
              ? i18n.translate('xpack.lens.editorFrame.emptyWorkspace', {
                  defaultMessage: 'Drop some fields here to start',
                })
              : i18n.translate('xpack.lens.editorFrame.emptyWorkspaceSimple', {
                  defaultMessage: 'Drop field here',
                })}
          </strong>
        </h2>
        {!expressionExists && (
          <>
            <EuiTextColor color="subdued" component="div">
              <p>
                {i18n.translate('xpack.lens.editorFrame.emptyWorkspaceHeading', {
                  defaultMessage: 'Lens is the recommended editor for creating visualizations',
                })}
              </p>
            </EuiTextColor>
            <p className="lnsWorkspacePanel__actions">
              <EuiLink
                href="https://www.elastic.co/products/kibana/feedback"
                target="_blank"
                external
              >
                {i18n.translate('xpack.lens.editorFrame.goToForums', {
                  defaultMessage: 'Make requests and give feedback',
                })}
              </EuiLink>
            </p>
          </>
        )}
      </div>
    </EuiText>
  );
};
