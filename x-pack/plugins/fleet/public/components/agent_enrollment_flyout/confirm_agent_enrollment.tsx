/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiText,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { sendGetAgents, useLink, useStartServices } from '../../hooks';
import { AGENTS_PREFIX } from '../../constants';
interface Props {
  policyId?: string;
  troubleshootLink: string;
  onClickViewAgents?: () => void;
  agentCount: number;
  showLoading?: boolean;
}

interface UsePollingAgentCountOptions {
  noLowerTimeLimit?: boolean;
  pollImmediately?: boolean;
}

const POLLING_INTERVAL_MS = 5 * 1000; // 5 sec

/**
 * Hook for finding agents enrolled since component was rendered. Should be
 * used by parent component to power rendering
 * @param policyId
 * @returns agentIds
 */
export const usePollingAgentCount = (policyId: string, opts?: UsePollingAgentCountOptions) => {
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [didPollInitially, setDidPollInitially] = useState(false);
  const timeout = useRef<number | undefined>(undefined);

  const lowerTimeLimitKuery = opts?.noLowerTimeLimit
    ? ''
    : `and ${AGENTS_PREFIX}.enrolled_at >= now-10m`;
  const kuery = `${AGENTS_PREFIX}.policy_id:"${policyId}" and not (_exists_:"${AGENTS_PREFIX}.unenrolled_at") ${lowerTimeLimitKuery}`;

  const getNewAgentIds = useCallback(async () => {
    const request = await sendGetAgents({
      kuery,
      showInactive: false,
    });

    const newAgentIds = request.data?.items.map((i) => i.id) ?? agentIds;
    if (newAgentIds.some((id) => !agentIds.includes(id))) {
      setAgentIds(newAgentIds);
    }
  }, [agentIds, kuery]);

  // optionally poll once on first render
  if (!didPollInitially && opts?.pollImmediately) {
    getNewAgentIds();
    setDidPollInitially(true);
  }

  useEffect(() => {
    let isAborted = false;

    const poll = () => {
      timeout.current = window.setTimeout(async () => {
        getNewAgentIds();
        if (!isAborted) {
          poll();
        }
      }, POLLING_INTERVAL_MS);
    };

    poll();

    if (isAborted || agentIds.length > 0) clearTimeout(timeout.current);

    return () => {
      isAborted = true;
    };
  }, [agentIds, policyId, kuery, getNewAgentIds]);
  return agentIds;
};

export const ConfirmAgentEnrollment: React.FunctionComponent<Props> = ({
  policyId,
  troubleshootLink,
  onClickViewAgents,
  agentCount,
  showLoading = false,
}) => {
  const { getHref } = useLink();
  const { application } = useStartServices();
  const showViewAgents = !!onClickViewAgents;
  const TroubleshootLink = () => (
    <EuiLink target="_blank" external href={troubleshootLink}>
      <FormattedMessage
        id="xpack.fleet.enrollmentInstructions.troubleshootingLink"
        defaultMessage="troubleshooting guide"
      />
    </EuiLink>
  );

  const onButtonClick = () => {
    if (onClickViewAgents) onClickViewAgents();
    const href = getHref('agent_list');
    application.navigateToUrl(href);
  };

  if (!policyId || (agentCount === 0 && !showLoading)) {
    return (
      <EuiText>
        <FormattedMessage
          data-test-subj="ConfirmAgentEnrollmentCallOut.troubleshooting"
          id="xpack.fleet.enrollmentInstructions.troubleshootingText"
          defaultMessage="If you are having trouble connecting, see our {link}."
          values={{
            link: <TroubleshootLink />,
          }}
        />
      </EuiText>
    );
  }

  if (showLoading && !agentCount) {
    return (
      <>
        <EuiCallOut
          size="m"
          color="primary"
          iconType={EuiLoadingSpinner}
          title={
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.loading.listening"
              defaultMessage="Listening for agent..."
            />
          }
        />
        <EuiSpacer size="m" />
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.loading.instructions"
            defaultMessage="After the agent starts up, the Elastic Stack listens for the agent and confirms the enrollment in Fleet. If you're having trouble connecting, check out the {link}."
            values={{
              link: <TroubleshootLink />,
            }}
          />
        </EuiText>
      </>
    );
  }

  return (
    <EuiCallOut
      data-test-subj="ConfirmAgentEnrollmentCallOut"
      title={i18n.translate('xpack.fleet.agentEnrollment.confirmation.title', {
        defaultMessage:
          '{agentCount} {agentCount, plural, one {agent has} other {agents have}} been enrolled.',
        values: {
          agentCount,
        },
      })}
      color="success"
      iconType="check"
    >
      {showViewAgents && (
        <EuiButton
          onClick={onButtonClick}
          color="success"
          data-test-subj="ConfirmAgentEnrollmentButton"
        >
          {i18n.translate('xpack.fleet.agentEnrollment.confirmation.button', {
            defaultMessage: 'View enrolled agents',
          })}
        </EuiButton>
      )}
    </EuiCallOut>
  );
};
