/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CRAWL_RULES_DOCS_URL } from '../../../app_search/routes';
import { clearFlashMessages, flashSuccessToast } from '../../../shared/flash_messages';
import { GenericEndpointInlineEditableTable } from '../../../shared/tables/generic_endpoint_inline_editable_table';

import { InlineEditableTableColumn } from '../../../shared/tables/inline_editable_table/types';
import { ItemWithAnID } from '../../../shared/tables/types';
import { CrawlerPolicies, CrawlRule, CrawlerRules } from '../../api/crawler/types';

import { CrawlerDomainDetailLogic } from './crawler_domain_detail_logic';

interface CrawlRulesTableProps {
  description?: React.ReactNode;
  domainId: string;
  indexName: string;
  crawlRules: CrawlRule[];
  defaultCrawlRule?: CrawlRule;
}

export const getReadableCrawlerRule = (rule: CrawlerRules) => {
  switch (rule) {
    case CrawlerRules.beginsWith:
      return i18n.translate(
        'xpack.enterpriseSearch.crawler.crawlRulesCrawlerRules.beginsWithLabel',
        {
          defaultMessage: 'Begins with',
        }
      );
    case CrawlerRules.endsWith:
      return i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesCrawlerRules.endsWithLabel', {
        defaultMessage: 'Ends with',
      });
    case CrawlerRules.contains:
      return i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesCrawlerRules.containsLabel', {
        defaultMessage: 'Contains',
      });
    case CrawlerRules.regex:
      return i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesCrawlerRules.regexLabel', {
        defaultMessage: 'Regex',
      });
  }
};

export const getReadableCrawlerPolicy = (policy: CrawlerPolicies) => {
  switch (policy) {
    case CrawlerPolicies.allow:
      return i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesPolicies.allowLabel', {
        defaultMessage: 'Allow',
      });
    case CrawlerPolicies.deny:
      return i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesPolicies.disallowLabel', {
        defaultMessage: 'Disallow',
      });
  }
};

export const getCrawlRulePathPatternTooltip = (crawlRule: CrawlRule) => {
  if (crawlRule.rule === CrawlerRules.regex) {
    return i18n.translate(
      'xpack.enterpriseSearch.crawler.crawlRulesTable.regexPathPatternTooltip',
      {
        defaultMessage:
          'The path pattern is a regular expression compatible with the Ruby language regular expression engine.',
      }
    );
  }

  return i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesTable.pathPatternTooltip', {
    defaultMessage:
      'The path pattern is a literal string except for the asterisk (*) character, which is a meta character that will match anything.',
  });
};

const DEFAULT_DESCRIPTION = (
  <p>
    <FormattedMessage
      id="xpack.enterpriseSearch.crawler.crawlRulesTable.description"
      defaultMessage="Create a crawl rule to include or exclude pages whose URL matches the rule. Rules run in sequential order, and each URL is evaluated according to the first match. {link}"
      values={{
        link: (
          <EuiLink href={CRAWL_RULES_DOCS_URL} target="_blank" external>
            {i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesTable.descriptionLinkText', {
              defaultMessage: 'Learn more about crawl rules',
            })}
          </EuiLink>
        ),
      }}
    />
  </p>
);

export const CrawlRulesTable: React.FC<CrawlRulesTableProps> = ({
  description = DEFAULT_DESCRIPTION,
  domainId,
  indexName,
  crawlRules,
  defaultCrawlRule,
}) => {
  const { updateCrawlRules } = useActions(CrawlerDomainDetailLogic);

  const columns: Array<InlineEditableTableColumn<ItemWithAnID>> = [
    {
      editingRender: (crawlRule, onChange, { isInvalid, isLoading }) => (
        <EuiSelect
          fullWidth
          hasNoInitialSelection
          value={(crawlRule as CrawlRule).policy}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          isInvalid={isInvalid}
          options={[CrawlerPolicies.allow, CrawlerPolicies.deny].map(
            (policyOption: CrawlerPolicies) => ({
              text: getReadableCrawlerPolicy(policyOption),
              value: policyOption,
            })
          )}
        />
      ),
      render: (crawlRule) => (
        <EuiText size="s">{getReadableCrawlerPolicy((crawlRule as CrawlRule).policy)}</EuiText>
      ),
      name: i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesTable.policyTableHead', {
        defaultMessage: 'Policy',
      }),
      field: 'policy',
    },
    {
      editingRender: (crawlRule, onChange, { isInvalid, isLoading }) => (
        <EuiSelect
          fullWidth
          hasNoInitialSelection
          value={(crawlRule as CrawlRule).rule}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          isInvalid={isInvalid}
          options={[
            CrawlerRules.beginsWith,
            CrawlerRules.endsWith,
            CrawlerRules.contains,
            CrawlerRules.regex,
          ].map((ruleOption: CrawlerRules) => ({
            text: getReadableCrawlerRule(ruleOption),
            value: ruleOption,
          }))}
        />
      ),
      render: (crawlRule) => (
        <EuiText size="s">{getReadableCrawlerRule((crawlRule as CrawlRule).rule)}</EuiText>
      ),
      name: i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesTable.ruleTableHead', {
        defaultMessage: 'Rule',
      }),
      field: 'rule',
    },
    {
      editingRender: (crawlRule, onChange, { isInvalid, isLoading }) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              value={(crawlRule as CrawlRule).pattern}
              onChange={(e) => onChange(e.target.value)}
              disabled={isLoading}
              isInvalid={isInvalid}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={getCrawlRulePathPatternTooltip(crawlRule as CrawlRule)}
              type="iInCircle"
              position="top"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      render: (crawlRule) => <EuiCode>{(crawlRule as CrawlRule).pattern}</EuiCode>,
      name: i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesTable.pathPatternTableHead', {
        defaultMessage: 'Path pattern',
      }),
      field: 'pattern',
    },
  ];

  const crawlRulesRoute = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/crawl_rules`;
  const domainRoute = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`;
  const getCrawlRuleRoute = (crawlRule: CrawlRule) =>
    `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/crawl_rules/${crawlRule.id}`;

  return (
    <GenericEndpointInlineEditableTable
      addButtonText={i18n.translate(
        'xpack.enterpriseSearch.crawler.crawlRulesTable.addButtonLabel',
        { defaultMessage: 'Add crawl rule' }
      )}
      columns={columns}
      description={description}
      instanceId="CrawlRulesTable"
      items={crawlRules}
      addRoute={crawlRulesRoute}
      dataProperty="crawl_rules"
      deleteRoute={getCrawlRuleRoute}
      updateRoute={getCrawlRuleRoute}
      reorderRoute={domainRoute}
      onAdd={(_, newCrawlRules) => {
        updateCrawlRules(newCrawlRules as CrawlRule[]);
        clearFlashMessages();
      }}
      onDelete={(_, newCrawlRules) => {
        updateCrawlRules(newCrawlRules as CrawlRule[]);
        clearFlashMessages();
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.crawler.crawlRulesTable.deleteSuccessToastMessage',
            {
              defaultMessage: 'The crawl rule has been deleted.',
            }
          )
        );
      }}
      onUpdate={(_, newCrawlRules) => {
        updateCrawlRules(newCrawlRules as CrawlRule[]);
        clearFlashMessages();
      }}
      onReorder={(newCrawlRules) => {
        updateCrawlRules(newCrawlRules as CrawlRule[]);
        clearFlashMessages();
      }}
      title={i18n.translate('xpack.enterpriseSearch.crawler.crawlRulesTable.title', {
        defaultMessage: 'Crawl rules',
      })}
      uneditableItems={defaultCrawlRule ? [defaultCrawlRule] : undefined}
      canRemoveLastItem
    />
  );
};
