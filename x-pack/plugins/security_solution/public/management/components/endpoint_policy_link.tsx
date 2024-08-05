/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiLinkAnchorProps, EuiTextProps } from '@elastic/eui';
import { EuiLink, EuiText, EuiIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { getPolicyDetailPath } from '../common/routing';
import { useNavigateByRouterEventHandler } from '../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../common/lib/kibana/hooks';
import type { PolicyDetailsRouteState } from '../../../common/endpoint/types';
import { useUserPrivileges } from '../../common/components/user_privileges';

export const POLICY_NOT_FOUND_MESSAGE = i18n.translate(
  'xpack.securitySolution.endpointPolicyLink.policyNotFound',
  { defaultMessage: 'Policy no longer available!' }
);

export type EndpointPolicyLinkProps = Omit<EuiLinkAnchorProps, 'href'> & {
  policyId: string;
  /**
   * If defined, then a tooltip will also be shown when a user hovers over the dispplayed value (`children`).
   * When set to `true`, the tooltip content will be the same as the value that is
   * displayed (`children`). The tooltip can also be customized by passing in the content to be shown.
   */
  tooltip?: boolean | React.ReactNode;
  /**
   * The revision of the policy that the Endpoint is running with (normally obtained from the host's metadata.
   */
  revision?: number;
  /**
   * Will display an "out of date" message.
   */
  isOutdated?: boolean;
  /** Text size to be applied to the display content (`children`) */
  textSize?: EuiTextProps['size'];
  /**
   * If policy still exists. In some cases, we could be displaying the policy name for a policy
   * that no longer exists (ex. it was deleted, but we still have data in ES that references that deleted policy)
   * When set to `true`, a link to the policy wil not be shown and the display value (`children`)
   * will have a message appended to it indicating policy no longer available.
   */
  policyExists?: boolean;
  backLink?: PolicyDetailsRouteState['backLink'];
};

/**
 * Will display the provided content (`children`) as a link that takes the user to the Endpoint
 * Policy Details page. A link is only displayed if the user has Authz to that page, otherwise the
 * provided display content will just be shown as is.
 */
export const EndpointPolicyLink = memo<EndpointPolicyLinkProps>(
  ({
    policyId,
    backLink,
    children,
    policyExists = true,
    isOutdated = false,
    tooltip = true,
    revision,
    textSize = 's',
    ...euiLinkProps
  }) => {
    const { getAppUrl } = useAppUrl();
    const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;
    const testId = useTestIdGenerator(euiLinkProps['data-test-subj']);

    const { toRoutePath, toRouteUrl } = useMemo(() => {
      const path = policyId ? getPolicyDetailPath(policyId) : '';
      return {
        toRoutePath: backLink ? { pathname: path, state: { backLink } } : path,
        toRouteUrl: getAppUrl({ path }),
      };
    }, [policyId, getAppUrl, backLink]);

    const clickHandler = useNavigateByRouterEventHandler(toRoutePath);

    const displayAsLink = useMemo(() => {
      return Boolean(canReadPolicyManagement && policyId && policyExists);
    }, [canReadPolicyManagement, policyExists, policyId]);

    const displayValue = useMemo(() => {
      const content = (
        <EuiText
          className="eui-displayInline eui-textTruncate"
          size={textSize}
          data-test-subj={testId('displayContent')}
        >
          {children}
        </EuiText>
      );

      return displayAsLink ? (
        // eslint-disable-next-line @elastic/eui/href-or-on-click
        <EuiLink
          href={toRouteUrl}
          onClick={clickHandler}
          {...euiLinkProps}
          data-test-subj={testId('link')}
        >
          {content}
        </EuiLink>
      ) : (
        content
      );
    }, [children, clickHandler, displayAsLink, euiLinkProps, testId, textSize, toRouteUrl]);

    const policyNoLongerAvailableMessage = useMemo(() => {
      return (
        ((!policyId || !policyExists) && (
          <EuiText
            color="subdued"
            size="xs"
            className="eui-textNoWrap"
            data-test-subj={testId('policyNotFoundMsg')}
          >
            <EuiIcon size="m" type="warning" color="warning" />
            &nbsp;
            {POLICY_NOT_FOUND_MESSAGE}
          </EuiText>
        )) ||
        null
      );
    }, [policyExists, policyId, testId]);

    const tooltipContent: React.ReactNode | undefined = useMemo(() => {
      const content = tooltip === true ? children : tooltip || undefined;
      return content ? (
        <div className="eui-textBreakAll" style={{ width: '100%' }}>
          {content}
          {policyNoLongerAvailableMessage && <>&nbsp;{`(${POLICY_NOT_FOUND_MESSAGE})`}</>}
        </div>
      ) : (
        content
      );
    }, [children, policyNoLongerAvailableMessage, tooltip]);

    return (
      <div>
        <EuiFlexGroup
          wrap={false}
          responsive={false}
          gutterSize="xs"
          alignItems="center"
          data-test-subj={testId()}
        >
          <EuiFlexItem
            data-test-subj={testId('policyName')}
            className="eui-textTruncate"
            grow={false}
            style={{ minWidth: '40px' }}
          >
            {tooltipContent ? (
              <EuiToolTip content={tooltipContent} anchorClassName="eui-textTruncate">
                {displayValue}
              </EuiToolTip>
            ) : (
              displayValue
            )}
          </EuiFlexItem>

          {revision && (
            <EuiFlexItem grow={false}>
              <EuiText
                color="subdued"
                size="xs"
                className="eui-textTruncate"
                data-test-subj={testId('revision')}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpointPolicyLink.policyVersion"
                  defaultMessage="rev. {revision}"
                  values={{ revision }}
                />
              </EuiText>
            </EuiFlexItem>
          )}

          {isOutdated && (
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs" className="eui-textTruncate">
                <EuiIcon size="m" type="warning" color="warning" className="eui-alignTop" />
                <span className="eui-displayInlineBlock" data-test-subj={testId('outdatedMsg')}>
                  <FormattedMessage
                    id="xpack.securitySolution.endpointPolicyLink.outdatedMessage"
                    defaultMessage="Out-of-date"
                  />
                </span>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {policyNoLongerAvailableMessage}
      </div>
    );
  }
);
EndpointPolicyLink.displayName = 'EndpointPolicyLink';
