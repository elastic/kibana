/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiPopover,
  EuiFormRow,
  EuiSwitch,
  EuiButtonEmpty,
  EuiPopoverTitle,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { useUrlParams } from '../../../../../hooks';
import {
  CHANGE_SEARCH_BAR_SYNTAX,
  CHANGE_SEARCH_BAR_SYNTAX_SIMPLE,
  SYNTAX_OPTIONS_LABEL,
} from '../translations';

const BoxesVerticalIcon = euiStyled(EuiButtonIcon)`
  padding: 10px 8px 0 8px;
  border-radius: 0;
  height: 38px;
  width: 32px;
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  padding-top: 8px;
  padding-bottom: 8px;
  cursor: pointer;
`;

interface Props {
  kqlSyntax: boolean;
  setKqlSyntax: (val: boolean) => void;
}

export const SearchType = ({ kqlSyntax, setKqlSyntax }: Props) => {
  const {
    services: { docLinks },
  } = useKibana();

  const [getUrlParams, updateUrlParams] = useUrlParams();

  const { query, search } = getUrlParams();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((prevState) => !prevState);

  const closePopover = () => setIsPopoverOpen(false);

  useEffect(() => {
    if (kqlSyntax && query) {
      updateUrlParams({ query: '' });
    }

    if (!kqlSyntax && search) {
      updateUrlParams({ search: '' });
    }
  }, [kqlSyntax, query, search, updateUrlParams]);

  const button = kqlSyntax ? (
    <EuiButtonEmpty
      data-test-subj="syntaxChangeToSimple"
      onClick={onButtonClick}
      aria-label={CHANGE_SEARCH_BAR_SYNTAX_SIMPLE}
      title={CHANGE_SEARCH_BAR_SYNTAX_SIMPLE}
    >
      KQL
    </EuiButtonEmpty>
  ) : (
    <BoxesVerticalIcon
      color="text"
      iconType="boxesVertical"
      onClick={onButtonClick}
      data-test-subj="syntaxChangeToKql"
      aria-label={CHANGE_SEARCH_BAR_SYNTAX}
      title={CHANGE_SEARCH_BAR_SYNTAX}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      ownFocus={true}
      anchorPosition="downRight"
    >
      <div style={{ width: '360px' }}>
        <EuiPopoverTitle>{SYNTAX_OPTIONS_LABEL}</EuiPopoverTitle>
        <EuiText>
          <p>
            <KqlDescription href={docLinks!.links.query.kueryQuerySyntax} />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFormRow label={KIBANA_QUERY_LANGUAGE} hasChildLabel={false}>
          <EuiSwitch
            name="switch"
            label={kqlSyntax ? 'On' : 'Off'}
            checked={kqlSyntax}
            onChange={() => setKqlSyntax(!kqlSyntax)}
            data-test-subj="toggleKqlSyntax"
          />
        </EuiFormRow>
      </div>
    </EuiPopover>
  );
};

const KqlDescription = ({ href }: { href: string }) => {
  return (
    <FormattedMessage
      id="xpack.uptime.queryBar.syntaxOptionsDescription"
      defaultMessage="The {docsLink} (KQL) offers a simplified query
              syntax and support for scripted fields. KQL also provides autocomplete if you have
              a Basic license or above. If you turn off KQL, Uptime
            uses simple wildcard search against {searchField} fields."
      values={{
        docsLink: (
          <EuiLink href={href} target="_blank" external>
            {KIBANA_QUERY_LANGUAGE}
          </EuiLink>
        ),
        searchField: <strong>Monitor Name, ID, Url</strong>,
      }}
    />
  );
};

const KIBANA_QUERY_LANGUAGE = i18n.translate('xpack.uptime.query.queryBar.kqlFullLanguageName', {
  defaultMessage: 'Kibana Query Language',
});
