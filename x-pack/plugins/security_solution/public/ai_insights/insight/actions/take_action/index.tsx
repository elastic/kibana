/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantContext } from '@kbn/elastic-assistant';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  useGeneratedHtmlId,
  EuiPopover,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useKibana } from '../../../../common/lib/kibana';
import { APP_ID } from '../../../../../common';
import { getAlertsInsightMarkdown } from '../../../get_alerts_insight_markdown/get_alerts_insight_markdown';
import * as i18n from './translations';
import type { AlertsInsight } from '../../../types';
import { useAddToNewCase } from '../use_add_to_case';
import { useAddToExistingCase } from '../use_add_to_existing_case';

interface Props {
  conversationTitle?: string;
  insight: AlertsInsight;
  promptContextId: string | undefined;
  replacements?: Replacements;
}

const TakeActionComponent = ({
  conversationTitle,
  insight,
  promptContextId,
  replacements,
}: Props) => {
  // get dependencies for creating / adding to cases:
  const { cases } = useKibana().services;
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canUserCreateAndReadCases = useCallback(
    () => userCasesPermissions.create && userCasesPermissions.read,
    [userCasesPermissions.create, userCasesPermissions.read]
  );
  const { disabled: addToCaseDisabled, onAddToNewCase } = useAddToNewCase({
    canUserCreateAndReadCases,
    title: insight.title,
  });
  const { onAddToExistingCase } = useAddToExistingCase({
    canUserCreateAndReadCases,
  });

  // get dependencies for viewing insights in the AI assistant:
  const { hasAssistantPrivilege } = useAssistantAvailability();
  const { showAssistantOverlay } = useAssistantContext();

  // proxy show / hide calls to the assistant context, using our internal prompt context id:
  const showOverlay = useCallback(() => {
    showAssistantOverlay({
      conversationTitle,
      promptContextId,
      showOverlay: true,
    });
  }, [conversationTitle, promptContextId, showAssistantOverlay]);

  // boilerplate for the take action popover:
  const takeActionContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'takeActionContextMenuPopover',
  });
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = useCallback(() => setPopover(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setPopover(false), []);

  // markdown for the alert insight, which will be exported to the case, or to the assistant:
  const markdown = useMemo(
    () =>
      getAlertsInsightMarkdown({
        insight,
        replacements,
      }),
    [insight, replacements]
  );

  // click handlers for the popover actions:
  const onClickAddToNewCase = useCallback(() => {
    closePopover();

    onAddToNewCase({
      alertIds: insight.alertIds,
      markdownComments: [markdown],
      replacements,
    });
  }, [closePopover, insight.alertIds, markdown, onAddToNewCase, replacements]);

  const onClickAddToExistingCase = useCallback(() => {
    closePopover();

    onAddToExistingCase({
      alertIds: insight.alertIds,
      markdownComments: [markdown],
      replacements,
    });
  }, [closePopover, insight.alertIds, markdown, onAddToExistingCase, replacements]);

  const onViewInAiAssistant = useCallback(() => {
    closePopover();
    showOverlay();
  }, [closePopover, showOverlay]);

  // button for the popover:
  const button = useMemo(
    () => (
      <EuiButtonEmpty
        data-test-subj="takeActionPopoverButton"
        iconSide="right"
        iconType="arrowDown"
        onClick={onButtonClick}
        size="s"
      >
        {i18n.TAKE_ACTION}
      </EuiButtonEmpty>
    ),
    [onButtonClick]
  );

  const viewInAiAssistantDisabled = useMemo(
    () => !hasAssistantPrivilege || promptContextId == null,
    [hasAssistantPrivilege, promptContextId]
  );

  // items for the popover:
  const items = useMemo(
    () => [
      <EuiContextMenuItem
        data-test-subj="addToCase"
        disabled={addToCaseDisabled}
        key="addToCase"
        onClick={onClickAddToNewCase}
      >
        {i18n.ADD_TO_NEW_CASE}
      </EuiContextMenuItem>,

      <EuiContextMenuItem
        data-test-subj="addToExistingCase"
        disabled={addToCaseDisabled}
        key="addToExistingCase"
        onClick={onClickAddToExistingCase}
      >
        {i18n.ADD_TO_EXISTING_CASE}
      </EuiContextMenuItem>,

      <EuiContextMenuItem
        data-test-subj="viewInAiAssistant"
        disabled={viewInAiAssistantDisabled}
        key="viewInAiAssistant"
        onClick={onViewInAiAssistant}
      >
        {i18n.VIEW_IN_AI_ASSISTANT}
      </EuiContextMenuItem>,
    ],
    [
      addToCaseDisabled,
      onClickAddToExistingCase,
      onClickAddToNewCase,
      onViewInAiAssistant,
      viewInAiAssistantDisabled,
    ]
  );

  return (
    <EuiPopover
      anchorPosition="downCenter"
      button={button}
      closePopover={closePopover}
      data-test-subj="takeAction"
      id={takeActionContextMenuPopoverId}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};

TakeActionComponent.displayName = 'TakeAction';
export const TakeAction = React.memo(TakeActionComponent);
