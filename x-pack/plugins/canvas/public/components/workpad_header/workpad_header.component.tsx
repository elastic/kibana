/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
// @ts-expect-error no @types definition
import { Shortcuts } from 'react-shortcuts';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** @deprecated QuickButtonGroup  - use `IconButtonGroup` from `@kbn/shared-ux-components */
import {
  AddFromLibraryButton,
  QuickButtonGroup,
  SolutionToolbar,
} from '../../../../../../src/plugins/presentation_util/public';
import { getElementStrings } from '../../../i18n';
import { CommitFn, ElementSpec } from '../../../types';
import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { RefreshControl } from './refresh_control';
// @ts-expect-error untyped local
import { FullscreenControl } from './fullscreen_control';
import { EditMenu } from './edit_menu';
import { ElementMenu } from './element_menu';
import { ShareMenu } from './share_menu';
import { ViewMenu } from './view_menu';
import { LabsControl } from './labs_control';
import { EditorMenu } from './editor_menu';

const strings = {
  getFullScreenButtonAriaLabel: () =>
    i18n.translate('xpack.canvas.workpadHeader.fullscreenButtonAriaLabel', {
      defaultMessage: 'View fullscreen',
    }),
  getFullScreenTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeader.fullscreenTooltip', {
      defaultMessage: 'Enter fullscreen mode',
    }),
  getHideEditControlTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeader.hideEditControlTooltip', {
      defaultMessage: 'Hide editing controls',
    }),
  getNoWritePermissionTooltipText: () =>
    i18n.translate('xpack.canvas.workpadHeader.noWritePermissionTooltip', {
      defaultMessage: "You don't have permission to edit this workpad",
    }),
  getShowEditControlTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeader.showEditControlTooltip', {
      defaultMessage: 'Show editing controls',
    }),
};

const elementStrings = getElementStrings();

export interface Props {
  isWriteable: boolean;
  canUserWrite: boolean;
  commit: CommitFn;
  onSetWriteable?: (writeable: boolean) => void;
  renderEmbedPanel: (onClick: () => void) => JSX.Element;
  elements: { [key: string]: ElementSpec };
  addElement: (element: Partial<ElementSpec>) => void;
}

export const WorkpadHeader: FC<Props> = ({
  isWriteable,
  canUserWrite,
  commit,
  onSetWriteable = () => {},
  renderEmbedPanel,
  elements,
  addElement,
}) => {
  const [isEmbedPanelVisible, setEmbedPanelVisible] = useState(false);
  const hideEmbedPanel = () => setEmbedPanelVisible(false);
  const showEmbedPanel = () => setEmbedPanelVisible(true);
  const toggleWriteable = () => onSetWriteable(!isWriteable);

  const keyHandler = (action: string) => {
    if (action === 'EDITING') {
      toggleWriteable();
    }
  };

  const fullscreenButton = ({ toggleFullscreen }: { toggleFullscreen: () => void }) => (
    <EuiToolTip
      position="bottom"
      content={
        <span>
          {strings.getFullScreenTooltip()}{' '}
          <ToolTipShortcut namespace="PRESENTATION" action="FULLSCREEN" />
        </span>
      }
    >
      <EuiButtonIcon
        iconType="fullScreen"
        aria-label={strings.getFullScreenButtonAriaLabel()}
        onClick={toggleFullscreen}
      />
    </EuiToolTip>
  );

  const getEditToggleToolTipText = () => {
    if (!canUserWrite) {
      return strings.getNoWritePermissionTooltipText();
    }

    const content = isWriteable
      ? strings.getHideEditControlTooltip()
      : strings.getShowEditControlTooltip();

    return content;
  };

  const getEditToggleToolTip = ({ textOnly } = { textOnly: false }) => {
    const content = getEditToggleToolTipText();

    if (textOnly) {
      return content;
    }

    return (
      <span>
        {content} <ToolTipShortcut namespace="EDITOR" action="EDITING" />
      </span>
    );
  };

  const createElement = useCallback(
    (elementName: string) => () => {
      const elementSpec = elements[elementName];
      if (elementSpec) {
        addElement(elements[elementName]);
      }
    },
    [addElement, elements]
  );

  const quickButtons = [
    {
      iconType: 'visText',
      createType: elementStrings.markdown.displayName,
      onClick: createElement('markdown'),
    },
    {
      iconType: 'node',
      createType: elementStrings.shape.displayName,
      onClick: createElement('shape'),
    },
    {
      iconType: 'image',
      createType: elementStrings.image.displayName,
      onClick: createElement('image'),
    },
  ];

  return (
    <>
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        className="canvasLayout__stageHeaderInner"
      >
        {isWriteable && (
          <EuiFlexItem grow={false}>
            <SolutionToolbar>
              {{
                primaryActionButton: <ElementMenu addElement={addElement} elements={elements} />,
                quickButtonGroup: <QuickButtonGroup buttons={quickButtons} />,
                extraButtons: [
                  <AddFromLibraryButton
                    onClick={showEmbedPanel}
                    data-test-subj="canvas-add-from-library-button"
                  />,
                  <EditorMenu addElement={addElement} />,
                ],
              }}
            </SolutionToolbar>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <ViewMenu />
            </EuiFlexItem>
            {isWriteable && (
              <EuiFlexItem grow={false}>
                <EditMenu commit={commit} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <ShareMenu />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LabsControl />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              {canUserWrite && (
                <Shortcuts
                  name="EDITOR"
                  handler={keyHandler}
                  targetNodeSelector="body"
                  global
                  isolate
                />
              )}
              <EuiToolTip position="bottom" content={getEditToggleToolTip()}>
                <EuiButtonIcon
                  iconType={isWriteable ? 'eyeClosed' : 'eye'}
                  onClick={toggleWriteable}
                  size="s"
                  aria-label={getEditToggleToolTipText()}
                  isDisabled={!canUserWrite}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RefreshControl />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FullscreenControl>{fullscreenButton}</FullscreenControl>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isEmbedPanelVisible ? renderEmbedPanel(hideEmbedPanel) : null}
    </>
  );
};

WorkpadHeader.propTypes = {
  isWriteable: PropTypes.bool,
  commit: PropTypes.func.isRequired,
  onSetWriteable: PropTypes.func,
  canUserWrite: PropTypes.bool,
  renderEmbedPanel: PropTypes.func.isRequired,
  elements: PropTypes.object.isRequired,
  addElement: PropTypes.func.isRequired,
};
