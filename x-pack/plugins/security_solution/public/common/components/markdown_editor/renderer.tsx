/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { cloneDeep } from 'lodash/fp';
import type { EuiLinkAnchorProps, EuiTextProps } from '@elastic/eui';
import { EuiMarkdownFormat, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import unified from 'unified';
import { FormattedMessage } from '@kbn/i18n-react';

import { parsingPlugins, processingPlugins, platinumOnlyPluginTokens } from './plugins';
import { MarkdownLink } from './markdown_link';
import { useKibana } from '../../lib/kibana';
import { useLicense } from '../../hooks/use_license';
import * as i18n from './translations';

interface Props {
  children: string;
  disableLinks?: boolean;
  textSize?: EuiTextProps['size'];
}

const MarkdownRendererComponent: React.FC<Props> = ({ children, disableLinks, textSize = 'm' }) => {
  const MarkdownLinkProcessingComponent: React.FC<EuiLinkAnchorProps> = useMemo(
    // eslint-disable-next-line react/display-name
    () => (props) => <MarkdownLink {...props} disableLinks={disableLinks} />,
    [disableLinks]
  );
  // Deep clone of the processing plugins to prevent affecting the markdown editor.
  const processingPluginList = cloneDeep(processingPlugins);
  // This line of code is TS-compatible and it will break if [1][1] change in the future.
  processingPluginList[1][1].components.a = MarkdownLinkProcessingComponent;
  const isPlatinum = useLicense().isAtLeast('platinum');
  const { application } = useKibana().services;
  const platinumPluginDetected = useMemo(() => {
    if (isPlatinum === false) {
      const markdownString = String(children);
      return platinumOnlyPluginTokens.some((token) => {
        const regex = new RegExp(token);
        return regex.test(markdownString);
      });
    } else {
      return false;
    }
  }, [children, isPlatinum]);
  const processor = useMemo(
    () => unified().use(parsingPlugins).use(processingPluginList),
    [processingPluginList]
  );
  const markdownParseResult = useMemo(() => {
    try {
      processor.processSync(children);
      return null;
    } catch (err) {
      return String(err.message);
    }
  }, [children, processor]);

  return (
    <>
      {platinumPluginDetected && (
        <>
          <EuiCallOut title={i18n.PLATINUM_WARNING} color="primary" iconType="lock">
            <FormattedMessage
              id="xpack.securitySolution.markdown.premiumPluginLinkPrefix"
              defaultMessage="To use these interactive markdown features, you must {link}."
              values={{
                link: (
                  <EuiLink
                    href={application.getUrlForApp('management', {
                      path: 'stack/license_management/home',
                    })}
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.markdown.premiumPluginLinkSuffix"
                      defaultMessage="start a trial or upgrade your subscription"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      {markdownParseResult !== null && (
        <>
          <EuiCallOut title={i18n.INVALID_MARKDOWN} color="danger" iconType="error">
            {markdownParseResult}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiMarkdownFormat
        parsingPluginList={parsingPlugins}
        processingPluginList={processingPluginList}
        textSize={textSize}
      >
        {children}
      </EuiMarkdownFormat>
    </>
  );
};

MarkdownRendererComponent.displayName = 'MarkdownRendererComponent';

export const MarkdownRenderer = memo(MarkdownRendererComponent);
