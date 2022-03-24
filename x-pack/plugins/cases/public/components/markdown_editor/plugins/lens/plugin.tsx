/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import {
  EuiCodeBlock,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiMarkdownEditorUiPlugin,
  EuiMarkdownContext,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiMarkdownAstNodePosition,
  EuiBetaBadge,
} from '@elastic/eui';
import React, { useCallback, useContext, useMemo, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import type { TypedLensByValueInput } from '../../../../../../lens/public';
import { useKibana } from '../../../../common/lib/kibana';
import { DRAFT_COMMENT_STORAGE_ID, ID } from './constants';
import { CommentEditorContext } from '../../context';
import { ModalContainer } from './modal_container';
import type { EmbeddablePackageState } from '../../../../../../../../src/plugins/embeddable/public';
import { SavedObjectFinderUi } from './saved_objects_finder';
import { useLensDraftComment } from './use_lens_draft_comment';
import { VISUALIZATION } from './translations';
import { useIsMainApplication } from '../../../../common/hooks';

const BetaBadgeWrapper = styled.span`
  display: inline-flex;

  .euiToolTipAnchor {
    display: inline-flex;
  }
`;

const DEFAULT_TIMERANGE = {
  from: 'now-7d',
  to: 'now',
  mode: 'relative',
};

type LensIncomingEmbeddablePackage = Omit<EmbeddablePackageState, 'input'> & {
  input: TypedLensByValueInput;
};

type LensEuiMarkdownEditorUiPlugin = EuiMarkdownEditorUiPlugin<{
  timeRange: TypedLensByValueInput['timeRange'];
  position: EuiMarkdownAstNodePosition;
  attributes: TypedLensByValueInput['attributes'];
}>;

const LensEditorComponent: LensEuiMarkdownEditorUiPlugin['editor'] = ({
  node,
  onCancel,
  onSave,
}) => {
  const location = useLocation();
  const {
    application: { currentAppId$ },
    embeddable,
    lens,
    storage,
    savedObjects,
    uiSettings,
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
  } = useKibana().services;
  const [currentAppId, setCurrentAppId] = useState<string | undefined>(undefined);
  const { draftComment, clearDraftComment } = useLensDraftComment();
  const commentEditorContext = useContext(CommentEditorContext);
  const markdownContext = useContext(EuiMarkdownContext);
  const isMainApplication = useIsMainApplication();

  const handleClose = useCallback(() => {
    if (currentAppId) {
      embeddable?.getStateTransfer().getIncomingEmbeddablePackage(currentAppId, true);
      clearDraftComment();
    }
    onCancel();
  }, [clearDraftComment, currentAppId, embeddable, onCancel]);

  const handleAdd = useCallback(
    (attributes, timerange) => {
      onSave(
        `!{${ID}${JSON.stringify({
          timeRange: timerange,
          attributes,
        })}}`,
        {
          block: true,
        }
      );

      handleClose();
    },
    [handleClose, onSave]
  );

  const handleUpdate = useCallback(
    (attributes, timerange, position) => {
      markdownContext.replaceNode(
        position,
        `!{${ID}${JSON.stringify({
          timeRange: timerange,
          attributes,
        })}}`
      );

      handleClose();
    },
    [handleClose, markdownContext]
  );

  const originatingPath = useMemo(
    () =>
      isMainApplication
        ? `/insightsAndAlerting/cases${location.pathname}${location.search}`
        : `${location.pathname}${location.search}`,
    [isMainApplication, location.pathname, location.search]
  );

  const handleCreateInLensClick = useCallback(() => {
    storage.set(DRAFT_COMMENT_STORAGE_ID, {
      commentId: commentEditorContext?.editorId,
      comment: commentEditorContext?.value,
      position: node?.position,
      caseTitle: commentEditorContext?.caseTitle,
      caseTags: commentEditorContext?.caseTags,
    });

    lens?.navigateToPrefilledEditor(undefined, {
      originatingApp: currentAppId,
      originatingPath,
    });
  }, [
    storage,
    commentEditorContext?.editorId,
    commentEditorContext?.value,
    commentEditorContext?.caseTitle,
    commentEditorContext?.caseTags,
    node?.position,
    lens,
    currentAppId,
    originatingPath,
  ]);

  const handleEditInLensClick = useCallback(
    (lensAttributes?, timeRange = DEFAULT_TIMERANGE) => {
      storage.set(DRAFT_COMMENT_STORAGE_ID, {
        commentId: commentEditorContext?.editorId,
        comment: commentEditorContext?.value,
        position: node?.position,
        caseTitle: commentEditorContext?.caseTitle,
        caseTags: commentEditorContext?.caseTags,
      });

      lens?.navigateToPrefilledEditor(
        lensAttributes || node?.attributes
          ? {
              id: '',
              timeRange,
              attributes: lensAttributes || node?.attributes,
            }
          : undefined,
        {
          originatingApp: currentAppId,
          originatingPath,
        }
      );
    },
    [
      storage,
      commentEditorContext?.editorId,
      commentEditorContext?.value,
      commentEditorContext?.caseTitle,
      commentEditorContext?.caseTags,
      node?.position,
      node?.attributes,
      lens,
      currentAppId,
      originatingPath,
    ]
  );

  const handleChooseLensSO = useCallback(
    (savedObjectId, savedObjectType, fullName, savedObject) => {
      handleEditInLensClick({
        ...savedObject.attributes,
        title: '',
        references: savedObject.references,
      });
    },
    [handleEditInLensClick]
  );

  const savedObjectMetaData = useMemo(
    () => [
      {
        type: 'lens',
        getIconForSavedObject: () => 'lensApp',
        name: i18n.translate(
          'xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.searchSelection.savedObjectType.lens',
          {
            defaultMessage: 'Lens',
          }
        ),
        includeFields: ['*'],
      },
    ],
    []
  );

  const euiFieldSearchProps = useMemo(
    () => ({
      prepend: i18n.translate(
        'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputPrependLabel',
        {
          defaultMessage: 'Template',
        }
      ),
    }),
    []
  );

  const euiFormRowProps = useMemo(
    () => ({
      label: i18n.translate(
        'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputLabel',
        {
          defaultMessage: 'Select lens',
        }
      ),
      labelAppend: (
        <EuiButtonEmpty onClick={handleCreateInLensClick} color="primary" size="xs">
          <FormattedMessage
            id="xpack.cases.markdownEditor.plugins.lens.createVisualizationButtonLabel"
            defaultMessage="Create visualization"
          />
        </EuiButtonEmpty>
      ),
      helpText: i18n.translate(
        'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputHelpText',
        {
          defaultMessage:
            'Insert lens from existing templates or creating a new one. You will only create lens for this comment and won’t change Visualize Library.',
        }
      ),
    }),
    [handleCreateInLensClick]
  );

  useEffect(() => {
    if (node?.attributes && currentAppId) {
      handleEditInLensClick(node.attributes, node.timeRange);
    }
  }, [handleEditInLensClick, node, currentAppId]);

  useEffect(() => {
    const getCurrentAppId = async () => {
      const appId = await currentAppId$.pipe(first()).toPromise();
      setCurrentAppId(appId);
    };
    getCurrentAppId();
  }, [currentAppId$]);

  useEffect(() => {
    let incomingEmbeddablePackage;

    if (currentAppId) {
      incomingEmbeddablePackage = embeddable
        ?.getStateTransfer()
        .getIncomingEmbeddablePackage(currentAppId, true) as LensIncomingEmbeddablePackage;
    }

    if (
      incomingEmbeddablePackage?.type === 'lens' &&
      incomingEmbeddablePackage?.input?.attributes
    ) {
      const lensTime = timefilter.getTime();
      const newTimeRange =
        lensTime?.from && lensTime?.to
          ? {
              from: lensTime.from,
              to: lensTime.to,
              mode: [lensTime.from, lensTime.to].join('').includes('now')
                ? ('relative' as const)
                : ('absolute' as const),
            }
          : undefined;

      if (draftComment?.position) {
        handleUpdate(
          incomingEmbeddablePackage?.input.attributes,
          newTimeRange,
          draftComment.position
        );
        return;
      }

      if (draftComment) {
        handleAdd(incomingEmbeddablePackage?.input.attributes, newTimeRange);
      }
    }
  }, [embeddable, storage, timefilter, currentAppId, handleAdd, handleUpdate, draftComment]);

  return (
    <ModalContainer direction="column" gutterSize="none">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.addVisualizationModalTitle"
                defaultMessage="Add visualization"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <BetaBadgeWrapper>
                <EuiBetaBadge
                  label={i18n.translate('xpack.cases.markdownEditor.plugins.lens.betaLabel', {
                    defaultMessage: 'Beta',
                  })}
                  tooltipContent={i18n.translate(
                    'xpack.cases.markdownEditor.plugins.lens.betaDescription',
                    {
                      defaultMessage:
                        'This module is not GA. You can only insert one lens per comment for now. Please help us by reporting bugs.',
                    }
                  )}
                />
              </BetaBadgeWrapper>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <SavedObjectFinderUi
          key="searchSavedObjectFinder"
          onChoose={handleChooseLensSO}
          showFilter={false}
          noItemsMessage={
            <FormattedMessage
              id="xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.searchSelection.notFoundLabel"
              defaultMessage="No matching lens found."
            />
          }
          savedObjectMetaData={savedObjectMetaData}
          fixedPageSize={10}
          uiSettings={uiSettings}
          savedObjects={savedObjects}
          euiFieldSearchProps={euiFieldSearchProps}
          // @ts-expect-error update types
          euiFormRowProps={euiFormRowProps}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={handleClose} fill>
          <FormattedMessage
            id="xpack.cases.markdownEditor.plugins.lens.closeButtonLabel"
            defaultMessage="Close"
          />
        </EuiButton>
      </EuiModalFooter>
    </ModalContainer>
  );
};
LensEditorComponent.displayName = 'LensEditor';

export const LensEditor = React.memo(LensEditorComponent);

export const plugin = {
  name: ID,
  button: {
    label: VISUALIZATION,
    iconType: 'lensApp',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'!{lens<config>}'}
    </EuiCodeBlock>
  ),
  editor: LensEditor,
};
