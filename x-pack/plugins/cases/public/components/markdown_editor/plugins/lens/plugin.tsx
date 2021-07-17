/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import {
  EuiFieldText,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiMarkdownEditorUiPlugin,
  EuiMarkdownContext,
  EuiCodeBlock,
  EuiSpacer,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormRow,
  EuiMarkdownAstNodePosition,
} from '@elastic/eui';
import React, { useCallback, useContext, useMemo, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLocation } from 'react-router-dom';

import type { TypedLensByValueInput } from '../../../../../../lens/public';
import { useKibana } from '../../../../common/lib/kibana';
import { LensMarkDownRenderer } from './processor';
import { DRAFT_COMMENT_STORAGE_ID, ID } from './constants';
import { CommentEditorContext } from '../../context';
import { LensSavedObjectsModal } from './lens_saved_objects_modal';
import { ModalContainer } from './modal_container';
import { getLensAttributes } from './helpers';
import type {
  EmbeddablePackageState,
  EmbeddableInput,
} from '../../../../../../../../src/plugins/embeddable/public';

type LensIncomingEmbeddablePackage = Omit<EmbeddablePackageState, 'input'> & {
  input: Omit<EmbeddableInput, 'id'> & {
    id: string | undefined;
    attributes: TypedLensByValueInput['attributes'];
  };
};

type LensEuiMarkdownEditorUiPlugin = EuiMarkdownEditorUiPlugin<{
  title: string;
  timeRange: TypedLensByValueInput['timeRange'];
  startDate: string;
  endDate: string;
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
    data: {
      indexPatterns,
      query: {
        timefilter: { timefilter },
      },
    },
  } = useKibana().services;

  const [currentAppId, setCurrentAppId] = useState<string | undefined>(undefined);

  const [editMode, setEditMode] = useState(!!node);
  const [lensEmbeddableAttributes, setLensEmbeddableAttributes] = useState<
    TypedLensByValueInput['attributes'] | null
  >(null);
  const [timeRange, setTimeRange] = useState<TypedLensByValueInput['timeRange']>(
    node?.timeRange ?? {
      from: 'now-7d',
      to: 'now',
      mode: 'relative',
    }
  );
  const [showLensSavedObjectsModal, setShowLensSavedObjectsModal] = useState(false);
  const commentEditorContext = useContext(CommentEditorContext);
  const markdownContext = useContext(EuiMarkdownContext);

  const handleTitleChange = useCallback((e) => {
    const title = e.target.value ?? '';
    setLensEmbeddableAttributes((currentValue) => {
      if (currentValue) {
        return { ...currentValue, title } as TypedLensByValueInput['attributes'];
      }

      return currentValue;
    });
  }, []);

  const handleAdd = useCallback(() => {
    let draftComment;
    if (storage.get(DRAFT_COMMENT_STORAGE_ID)) {
      try {
        draftComment = JSON.parse(storage.get(DRAFT_COMMENT_STORAGE_ID));
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }

    if (!node && draftComment?.position) {
      markdownContext.replaceNode(
        draftComment.position,
        `!{${ID}${JSON.stringify({
          timeRange,
          editMode,
          attributes: lensEmbeddableAttributes,
        })}}`
      );

      onCancel();
      return;
    }

    if (lensEmbeddableAttributes) {
      onSave(
        `!{${ID}${JSON.stringify({
          timeRange,
          editMode,
          attributes: lensEmbeddableAttributes,
        })}}`,
        {
          block: true,
        }
      );
    }
  }, [
    storage,
    node,
    lensEmbeddableAttributes,
    markdownContext,
    timeRange,
    editMode,
    onCancel,
    onSave,
  ]);

  const handleDelete = useCallback(() => {
    if (node?.position) {
      markdownContext.replaceNode(node.position, ``);
      onCancel();
      return;
    }

    let draftComment;
    if (storage.get(DRAFT_COMMENT_STORAGE_ID)) {
      try {
        draftComment = JSON.parse(storage.get(DRAFT_COMMENT_STORAGE_ID));
        markdownContext.replaceNode(draftComment?.position, ``);
        onCancel();

        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
  }, [markdownContext, node?.position, onCancel, storage]);

  const originatingPath = useMemo(() => `${location.pathname}${location.search}`, [
    location.pathname,
    location.search,
  ]);

  const handleEditInLensClick = useCallback(
    async (lensAttributes?) => {
      storage.set(
        DRAFT_COMMENT_STORAGE_ID,
        JSON.stringify({
          commentId: commentEditorContext?.editorId,
          comment: commentEditorContext?.value,
          position: node?.position,
        })
      );

      lens?.navigateToPrefilledEditor(
        {
          id: '',
          timeRange,
          attributes:
            lensAttributes ??
            lensEmbeddableAttributes ??
            getLensAttributes(await indexPatterns.getDefault()),
        },
        {
          originatingApp: currentAppId!,
          originatingPath,
        }
      );
    },
    [
      storage,
      commentEditorContext?.editorId,
      commentEditorContext?.value,
      node?.position,
      lensEmbeddableAttributes,
      lens,
      timeRange,
      indexPatterns,
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

  const handleCloseLensSOModal = useCallback(() => setShowLensSavedObjectsModal(false), []);

  useEffect(() => {
    if (node?.attributes) {
      setLensEmbeddableAttributes(node.attributes);
    }
  }, [node?.attributes]);

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
      setLensEmbeddableAttributes(incomingEmbeddablePackage?.input.attributes);
      const lensTime = timefilter.getTime();
      if (lensTime?.from && lensTime?.to) {
        setTimeRange({
          from: lensTime.from,
          to: lensTime.to,
          mode: [lensTime.from, lensTime.to].join('').includes('now') ? 'relative' : 'absolute',
        });
      }

      let draftComment;
      if (storage.get(DRAFT_COMMENT_STORAGE_ID)) {
        try {
          draftComment = JSON.parse(storage.get(DRAFT_COMMENT_STORAGE_ID));
          setEditMode(!!draftComment?.editMode);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    }
  }, [embeddable, storage, timefilter, currentAppId]);

  return (
    <>
      <ModalContainer>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {editMode ? (
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.editVisualizationModalTitle"
                defaultMessage="Edit visualization"
              />
            ) : (
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.addVisualizationModalTitle"
                defaultMessage="Add visualization"
              />
            )}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                onClick={() => handleEditInLensClick()}
                color="primary"
                size="m"
                iconType="lensApp"
                fill
              >
                <FormattedMessage
                  id="xpack.cases.markdownEditor.plugins.lens.createVisualizationButtonLabel"
                  defaultMessage="Create visualization"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                color="text"
                size="m"
                iconType="folderOpen"
                onClick={() => setShowLensSavedObjectsModal(true)}
              >
                <FormattedMessage
                  id="xpack.cases.markdownEditor.plugins.lens.addVisualizationFromLibraryButtonLabel"
                  defaultMessage="Add from library"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {lensEmbeddableAttributes ? (
            <EuiFlexGroup justifyContent="flexEnd" alignItems="flexEnd">
              <EuiFlexItem>
                <EuiFormRow label="Title">
                  <EuiFieldText
                    placeholder={i18n.translate(
                      'xpack.cases.markdownEditor.plugins.lens.visualizationTitleFieldPlaceholder',
                      {
                        defaultMessage: 'Visualization title',
                      }
                    )}
                    value={lensEmbeddableAttributes?.title ?? ''}
                    onChange={handleTitleChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="lensApp"
                  fullWidth={false}
                  isDisabled={!lens?.canUseEditor() || lensEmbeddableAttributes === null}
                  onClick={() => handleEditInLensClick()}
                >
                  <FormattedMessage
                    id="xpack.cases.markdownEditor.plugins.lens.editVisualizationInLensButtonLabel"
                    defaultMessage="Edit visualization"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          <EuiSpacer />
          <LensMarkDownRenderer
            attributes={lensEmbeddableAttributes}
            timeRange={timeRange}
            viewMode={false}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{'Cancel'}</EuiButtonEmpty>
          {editMode ? (
            <EuiButton onClick={handleDelete} color="danger" disabled={!lensEmbeddableAttributes}>
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.deleteVisualizationButtonLabel"
                defaultMessage="Delete"
              />
            </EuiButton>
          ) : null}
          <EuiButton
            onClick={handleAdd}
            fill
            disabled={!lensEmbeddableAttributes || !lensEmbeddableAttributes?.title?.length}
          >
            {editMode ? (
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.updateVisualizationButtonLabel"
                defaultMessage="Update"
              />
            ) : (
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.addVisualizationToCaseButtonLabel"
                defaultMessage="Add to a Case"
              />
            )}
          </EuiButton>
        </EuiModalFooter>
      </ModalContainer>
      {showLensSavedObjectsModal ? (
        <LensSavedObjectsModal onClose={handleCloseLensSOModal} onChoose={handleChooseLensSO} />
      ) : null}
    </>
  );
};

export const LensEditor = React.memo(LensEditorComponent);

export const plugin: LensEuiMarkdownEditorUiPlugin = {
  name: ID,
  button: {
    label: i18n.translate('xpack.cases.markdownEditor.plugins.lens.insertLensButtonLabel', {
      defaultMessage: 'Insert visualization',
    }),
    iconType: 'lensApp',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'!{lens<config>}'}
    </EuiCodeBlock>
  ),
  editor: LensEditor,
};
