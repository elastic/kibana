/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../../utils';
import applyChangesIllustrationDark from '../../../assets/render_dark@2x.png';
import applyChangesIllustrationLight from '../../../assets/render_light@2x.png';

const applyChangesString = i18n.translate('xpack.lens.editorFrame.applyChanges', {
  defaultMessage: 'Apply changes',
});

export const ApplyChangesPrompt = ({
  core,
  onApplyButtonClick,
}: {
  core: CoreStart;
  onApplyButtonClick: () => void;
}) => {
  const IS_DARK_THEME: boolean = useObservable(core.theme.theme$, { darkMode: false }).darkMode;

  return (
    <EuiText
      className={'lnsWorkspacePanel__emptyContent'}
      textAlign="center"
      data-test-subj="workspace-apply-changes-prompt"
      size="s"
    >
      <div>
        <img
          aria-hidden={true}
          src={IS_DARK_THEME ? applyChangesIllustrationDark : applyChangesIllustrationLight}
          alt={applyChangesString}
          className="lnsWorkspacePanel__promptIllustration"
        />
        <h2>
          <strong>
            {i18n.translate('xpack.lens.editorFrame.applyChangesWorkspacePrompt', {
              defaultMessage: 'Apply changes to render visualization',
            })}
          </strong>
        </h2>
        <p className="lnsWorkspacePanel__actions">
          <EuiButtonEmpty
            size="s"
            className={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
            iconType="checkInCircleFilled"
            onClick={onApplyButtonClick}
            data-test-subj="lnsApplyChanges__workspace"
          >
            {applyChangesString}
          </EuiButtonEmpty>
        </p>
      </div>
    </EuiText>
  );
};
