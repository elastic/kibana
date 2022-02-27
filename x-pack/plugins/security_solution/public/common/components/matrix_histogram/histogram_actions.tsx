/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { Case, CommentType } from '../../../../../cases/common';
import {
  CasesDeepLinkId,
  DRAFT_COMMENT_STORAGE_ID,
  generateCaseViewPath,
  GetAllCasesSelectorModalProps,
  GetCreateCaseFlyoutProps,
} from '../../../../../cases/public';
import { LensEmbeddableInput, TypedLensByValueInput } from '../../../../../lens/public';
import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana/kibana_react';

import { InputsModelId } from '../../store/inputs/constants';
import { ModalInspectQuery } from '../inspect/modal';
import { useInspect } from '../inspect/use_inspect';
import { LensAttributes } from './types';
import { useLensAttributes } from './use_lens_attributes';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useGetUserCasesPermissions } from '../../lib/kibana';
import { ADD_TO_CASE_SUCCESS, VIEW_CASE } from './translations';
export interface HistogramActionsProps {
  className?: string;
  getLensAttributes?: (stackByField?: string) => LensAttributes;
  inputId?: InputsModelId;
  inspectIndex?: number;
  isInspectButtonDisabled?: boolean;
  isMultipleQuery?: boolean;
  lensAttributes: LensAttributes;
  onCloseInspect?: () => void;
  queryId: string;
  timerange: { from: string; to: string };
  title: React.ReactNode;
  stackByField?: string;
}

const StyledEuiPopover = styled(EuiPopover)`
  &.kpi-matrix-histogram-actions {
    position: absolute;
    top: 0;
    right: 0;
  }
`;

export const HISTOGRAM_ACTIONS_BUTTON_CLASS = 'histogram-actions-trigger';

const owner = APP_ID;
const appId = 'securitySolutionUI';

export const CaseToastText = ({ linkUrl }: { linkUrl: string }) => {
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem>
        <EuiLink href={linkUrl} target="_blank">
          {VIEW_CASE}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const HistogramActions = ({
  className,
  getLensAttributes,
  inputId = 'global',
  inspectIndex = 0,
  isInspectButtonDisabled,
  isMultipleQuery,
  lensAttributes,
  onCloseInspect,
  queryId,
  timerange,
  title,
  stackByField,
}: HistogramActionsProps) => {
  const {
    lens,
    cases,
    theme,
    application: { getUrlForApp },
    notifications: { toasts },
  } = useKibana<StartServices>().services;
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;

  const {
    canUseEditor,
    navigateToPrefilledEditor,
    SaveModalComponent: LensSaveModalComponent,
  } = lens;
  const [isPopoverOpen, setPopover] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);

  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'contextMenuPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const attributes = useLensAttributes({
    lensAttributes,
    getLensAttributes,
    stackByField,
  });

  const [isCreateCaseFlyoutOpen, setIsCreateCaseFlyoutOpen] = useState(false);
  // const [isSaving, setIsSaving] = useState(false);

  const {
    disabled: isAddToCaseDisabled,
    closeAllCaseModal,
    isAllCaseModalOpen,
    onCaseClicked,
    onAddToExistingCaseClicked,
  } = useAddToExistingCase({
    onAddToCaseClicked: closePopover,
    lensAttributes: attributes,
    timeRange: timerange,
    userCanCrud,
  });

  const onAddToNewCaseClicked = useCallback(() => {
    closePopover();

    setIsCreateCaseFlyoutOpen(true);
  }, []);

  const getToastText = useCallback(
    (theCase) =>
      toMountPoint(
        <CaseToastText
          linkUrl={getUrlForApp(appId, {
            deepLinkId: CasesDeepLinkId.cases,
            path: generateCaseViewPath({ detailName: theCase.id }),
          })}
        />,
        { theme$: theme?.theme$ }
      ),
    [getUrlForApp, theme?.theme$]
  );
  const onCreateCaseSuccess = useCallback(
    async (theCase: Case) => {
      setIsCreateCaseFlyoutOpen(false);
      toasts.addSuccess(
        {
          title: ADD_TO_CASE_SUCCESS(theCase.title),
          text: getToastText(theCase),
        },
        {
          toastLifeTimeMs: 10000,
        }
      );
    },
    [getToastText, toasts]
  );

  const allCasesSelectorModalProps: GetAllCasesSelectorModalProps = {
    onRowClick: onCaseClicked,
    userCanCrud,
    owner: [owner],
    onClose: closeAllCaseModal,
  };

  const createCaseFlyoutProps: GetCreateCaseFlyoutProps = useMemo(() => {
    const attachments = [
      {
        comment: `!{lens${JSON.stringify({
          timeRange: timerange,
          attributes,
        })}}`,
        owner,
        type: CommentType.user as const,
      },
    ];
    return {
      // afterCaseCreated: onCaseCreated,
      onClose: () => {
        setIsCreateCaseFlyoutOpen(false);
      },
      onSuccess: onCreateCaseSuccess,
      owner: [owner],
      userCanCrud,
      // features: casesFeatures,
      attachments,
    };
  }, [timerange, attributes, onCreateCaseSuccess, userCanCrud]);

  const onOpenInLens = useCallback(() => {
    closePopover();
    navigateToPrefilledEditor(
      {
        id: '',
        timeRange: timerange,
        attributes,
      },
      {
        openInNewTab: true,
      }
    );
  }, [attributes, navigateToPrefilledEditor, timerange]);
  const onSaveVisualization = useCallback(() => {
    setIsSaveModalVisible(true);
    closePopover();
  }, []);
  const {
    additionalRequests,
    additionalResponses,
    handleClick: handleInspectButtonClick,
    handleCloseModal: handleCloseInspectModal,
    isButtonDisabled: disableInspectButton,
    isShowingModal,
    request,
    response,
  } = useInspect({
    inputId,
    inspectIndex,
    isDisabled: isInspectButtonDisabled,
    multiple: isMultipleQuery,
    onCloseInspect,
    onClick: closePopover,
    queryId,
  });

  const items = [
    <EuiContextMenuItem
      icon="visArea"
      key="openInLens"
      disabled={!canUseEditor() || attributes == null}
      onClick={onOpenInLens}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.openInLens"
        defaultMessage="Open in Lens"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="save"
      key="saveVisualization"
      disabled={!userCanCrud}
      onClick={onSaveVisualization}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.saveVisualization"
        defaultMessage="Save Visualization"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="search"
      key="Inspect"
      onClick={handleInspectButtonClick}
      disabled={disableInspectButton}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.inspect"
        defaultMessage="Inspect"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={attributes == null || !userCanCrud}
      icon="search"
      onClick={onAddToNewCaseClicked}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.addToNewCase"
        defaultMessage="Add to new Case"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={isAddToCaseDisabled}
      icon="search"
      onClick={onAddToExistingCaseClicked}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.addToExistingCase"
        defaultMessage="Add to Existing Case"
      />
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButtonIcon
      className={HISTOGRAM_ACTIONS_BUTTON_CLASS}
      iconType="boxesHorizontal"
      onClick={onButtonClick}
    />
  );

  return (
    <>
      {isSaveModalVisible && (
        <LensSaveModalComponent
          initialInput={attributes as unknown as LensEmbeddableInput}
          onSave={() => {}}
          onClose={() => setIsSaveModalVisible(false)}
        />
      )}
      <StyledEuiPopover
        id={contextMenuPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        className={className}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        panelClassName="withHoverActions__popover"
      >
        <EuiContextMenuPanel data-test-subj="histogram-actions-panel" size="s" items={items} />
      </StyledEuiPopover>
      {isShowingModal && request !== null && response !== null && (
        <ModalInspectQuery
          additionalRequests={additionalRequests}
          additionalResponses={additionalResponses}
          closeModal={handleCloseInspectModal}
          data-test-subj="histogram-actions-inspect-modal"
          inputId={inputId}
          request={request}
          response={response}
          title={title}
        />
      )}
      {isCreateCaseFlyoutOpen && cases.getCreateCaseFlyout(createCaseFlyoutProps)}
      {isAllCaseModalOpen && cases.getAllCasesSelectorModal(allCasesSelectorModalProps)}
    </>
  );
};
