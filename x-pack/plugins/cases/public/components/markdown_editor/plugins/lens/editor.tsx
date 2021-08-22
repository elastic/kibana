/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import {
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiMarkdownEditorUiPlugin,
  EuiMarkdownContext,
  EuiSpacer,
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
import { FormattedMessage } from '@kbn/i18n/react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import type { TypedLensByValueInput } from '../../../../../../lens/public';
import { useKibana } from '../../../../common/lib/kibana';
import { LensMarkDownRenderer } from './processor';
import { DRAFT_COMMENT_STORAGE_ID, ID } from './constants';
import { CommentEditorContext } from '../../context';
import { ModalContainer } from './modal_container';
import type { EmbeddablePackageState } from '../../../../../../../../src/plugins/embeddable/public';
import { SavedObjectFinderUi } from './saved_objects_finder';
import { useLensDraftComment } from './use_lens_draft_comment';

const BetaBadgeWrapper = styled.span`
  display: inline-flex;

  .euiToolTipAnchor {
    display: inline-flex;
  }
`;

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

  const [lensEmbeddableAttributes, setLensEmbeddableAttributes] = useState<
    TypedLensByValueInput['attributes'] | null
  >(node?.attributes || null);
  const [timeRange, setTimeRange] = useState<TypedLensByValueInput['timeRange']>(
    node?.timeRange ?? {
      from: 'now-7d',
      to: 'now',
      mode: 'relative',
    }
  );

  const commentEditorContext = useContext(CommentEditorContext);
  const markdownContext = useContext(EuiMarkdownContext);

  const handleClose = useCallback(() => {
    if (currentAppId) {
      embeddable?.getStateTransfer().getIncomingEmbeddablePackage(currentAppId, true);
      clearDraftComment();
    }
    onCancel();
  }, [clearDraftComment, currentAppId, embeddable, onCancel]);

  const handleAdd = useCallback(() => {
    if (lensEmbeddableAttributes) {
      onSave(
        `!{${ID}${JSON.stringify({
          timeRange,
          attributes: lensEmbeddableAttributes,
        })}}`,
        {
          block: true,
        }
      );
    }

    handleClose();
  }, [lensEmbeddableAttributes, handleClose, timeRange, onSave]);

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

  const originatingPath = useMemo(() => `${location.pathname}${location.search}`, [
    location.pathname,
    location.search,
  ]);

  const handleCreateInLensClick = useCallback(() => {
    storage.set(DRAFT_COMMENT_STORAGE_ID, {
      lensEditorQuery: '',
      commentId: commentEditorContext?.editorId,
      comment: commentEditorContext?.value,
      position: node?.position,
    });

    lens?.navigateToPrefilledEditor(
      lensEmbeddableAttributes
        ? {
            id: '',
            timeRange,
            attributes: lensEmbeddableAttributes,
          }
        : undefined,
      {
        originatingApp: currentAppId!,
        originatingPath,
      }
    );
  }, [
    storage,
    commentEditorContext?.editorId,
    commentEditorContext?.value,
    node?.position,
    currentAppId,
    originatingPath,
    lens,
    lensEmbeddableAttributes,
    timeRange,
  ]);

  const handleEditInLensClick = useCallback(
    (lensAttributes?, savedLensTitle?) => {
      storage.set(DRAFT_COMMENT_STORAGE_ID, {
        lensEditorQuery: savedLensTitle ?? draftComment?.lensEditorQuery,
        commentId: commentEditorContext?.editorId,
        comment: commentEditorContext?.value,
        position: node?.position,
      });

      lens?.navigateToPrefilledEditor(
        lensAttributes || lensEmbeddableAttributes
          ? {
              id: '',
              timeRange,
              attributes: lensAttributes ?? lensEmbeddableAttributes,
            }
          : undefined,
        {
          originatingApp: currentAppId!,
          originatingPath,
        }
      );
    },
    [
      storage,
      draftComment?.lensEditorQuery,
      commentEditorContext?.editorId,
      commentEditorContext?.value,
      node?.position,
      currentAppId,
      originatingPath,
      lens,
      lensEmbeddableAttributes,
      timeRange,
    ]
  );

  const handleChooseLensSO = useCallback(
    (savedObjectId, savedObjectType, fullName, savedObject) => {
      handleEditInLensClick(
        {
          ...savedObject.attributes,
          title: '',
          references: savedObject.references,
        },
        savedObject.attributes.title
      );
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
        'xpack.cases.markdownEditor.plugins.lens.savedObjectsFinder.searchInputPrependLabel',
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
        'xpack.cases.markdownEditor.plugins.lens.savedObjectsFinder.searchInputLabel',
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
        'xpack.cases.markdownEditor.plugins.lens.savedObjectsFinder.searchInputHelpText',
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
      handleEditInLensClick(node.attributes);
    }
  }, [handleEditInLensClick, node?.attributes, currentAppId]);

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

      setLensEmbeddableAttributes(incomingEmbeddablePackage?.input.attributes);

      if (newTimeRange) {
        setTimeRange(newTimeRange);
      }
    }
  }, [
    embeddable,
    storage,
    timefilter,
    currentAppId,
    handleAdd,
    draftComment?.position,
    handleUpdate,
  ]);

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
                        'Cases Lens plugin is not GA. Please help us by reporting any bugs.',
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
          initialHideListing={!!draftComment?.lensEditorQuery}
          initialQuery={draftComment?.lensEditorQuery}
          euiFieldSearchProps={euiFieldSearchProps}
          // @ts-expect-error update types
          euiFormRowProps={euiFormRowProps}
        />

        {lensEmbeddableAttributes ? (
          <>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  isDisabled={!lens?.canUseEditor()}
                  onClick={handleEditInLensClick}
                  size="xs"
                >
                  <FormattedMessage
                    id="xpack.cases.markdownEditor.plugins.lens.editVisualizationInLensButtonLabel"
                    defaultMessage="Edit visualization"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <LensMarkDownRenderer
              attributes={lensEmbeddableAttributes}
              timeRange={timeRange}
              viewMode={false}
            />
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={handleClose}>
          <FormattedMessage
            id="xpack.cases.markdownEditor.plugins.lens.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton onClick={handleAdd} fill disabled={!lensEmbeddableAttributes}>
          <FormattedMessage
            id="xpack.cases.markdownEditor.plugins.lens.insertLensButtonLabel"
            defaultMessage="Insert lens"
          />
        </EuiButton>
      </EuiModalFooter>
    </ModalContainer>
  );
};

export const LensEditor = React.memo(LensEditorComponent);
