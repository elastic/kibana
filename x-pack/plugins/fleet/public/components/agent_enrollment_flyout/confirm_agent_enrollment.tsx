/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiCallOut, EuiButton, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { sendGetAgents } from '../../hooks';
import { AGENTS_PREFIX } from '../../constants';
interface Props {
  policyId?: string;
  troubleshootLink: string;
  onClickViewAgents?: () => void;
  agentCount: number;
  agentEnrolled: boolean;
  setAgentEnrollment: (v: boolean) => void;
}

const POLLING_INTERVAL_MS = 5 * 1000; // 5 sec

/**
 * Hook for finding agents enrolled since component was rendered. Should be
 * used by parent component to power rendering
 * @param policyId
 * @returns
 */
export const usePollingAgentCount = (policyId: string | undefined) => {
  const initialIds: string[] = policyId ? [policyId] : [];

  const [agentIds, setAgentIds] = useState(initialIds);

  // Use useRef to guarantee we get the same date on each render
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let isAborted = false;

    const poll = () => {
      timeout = setTimeout(async () => {
        const secSinceMounted = Math.ceil((Date.now() - mountedAt.current) / 1000);
        const request = await sendGetAgents({
          kuery: `${AGENTS_PREFIX}.policy_id:"${policyId}" and ${AGENTS_PREFIX}.enrolled_at >= "now-${secSinceMounted}s"`,
          showInactive: false,
        });
        const newAgentIds = request.data?.items.map((i) => i.id) ?? agentIds;
        if (newAgentIds.some((id) => !agentIds.includes(id))) {
          setAgentIds(newAgentIds);
        }
        if (!isAborted) {
          poll();
        }
      }, POLLING_INTERVAL_MS);
    };

    poll();
    return () => {
      isAborted = true;
      clearTimeout(timeout);
    };
  }, [agentIds, policyId]);
  return agentIds;
};

export const ConfirmAgentEnrollment: React.FunctionComponent<Props> = ({
  policyId,
  troubleshootLink,
  onClickViewAgents,
  agentCount,
  agentEnrolled,
  setAgentEnrollment,
}) => {
  if (policyId && agentCount > 0) {
    setAgentEnrollment(true);
  }

  if (!agentEnrolled) {
    return (
      <EuiText>
        <FormattedMessage
          data-test-subj="ConfirmAgentEnrollmentCallOut.troubleshooting"
          id="xpack.fleet.enrollmentInstructions.troubleshootingText"
          defaultMessage="If you are having trouble connecting, see our {link}."
          values={{
            link: (
              <EuiLink target="_blank" external href={troubleshootLink}>
                <FormattedMessage
                  id="xpack.fleet.enrollmentInstructions.troubleshootingLink"
                  defaultMessage="troubleshooting guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
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
      <EuiButton
        onClick={onClickViewAgents}
        color="success"
        data-test-subj="ConfirmAgentEnrollmentButton"
      >
        {i18n.translate('xpack.fleet.agentEnrollment.confirmation.button', {
          defaultMessage: 'View enrolled agents',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};
