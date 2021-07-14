/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThreatIndicatorRule } from '../../objects/rule';
import { cleanKibana, reload } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  JSON_LINES,
  TABLE_CELL,
  TABLE_ROWS,
  THREAT_CONTENT,
  THREAT_DETAILS_VIEW,
  THREAT_INTEL_TAB,
  THREAT_SUMMARY_VIEW,
  TITLE,
} from '../../screens/alerts_details';
import { TIMELINE_FIELD } from '../../screens/rule_details';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { expandFirstAlert, goToManageAlertsDetectionRules } from '../../tasks/alerts';
import { createCustomIndicatorRule } from '../../tasks/api_calls/rules';
import {
  openJsonView,
  openThreatIndicatorDetails,
  scrollJsonViewToBottom,
} from '../../tasks/alerts_details';

import { ALERTS_URL } from '../../urls/navigation';
import { addsFieldsToTimeline } from '../../tasks/rule_details';

describe('CTI Enrichment', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('threat_indicator');
    esArchiverLoad('suspicious_source_event');
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    goToManageAlertsDetectionRules();
    createCustomIndicatorRule(getNewThreatIndicatorRule());
    reload();
  });

  after(() => {
    esArchiverUnload('threat_indicator');
    esArchiverUnload('suspicious_source_event');
  });

  beforeEach(() => {
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    goToManageAlertsDetectionRules();
    goToRuleDetails();
  });

  it('Displays enrichment matched.* fields on the timeline', () => {
    const expectedFields = {
      'threat.indicator.matched.atomic': getNewThreatIndicatorRule().atomic,
      'threat.indicator.matched.type': 'indicator_match_rule',
      'threat.indicator.matched.field': getNewThreatIndicatorRule().indicatorMappingField,
    };
    const fields = Object.keys(expectedFields) as Array<keyof typeof expectedFields>;

    addsFieldsToTimeline('threat.indicator.matched', fields);

    fields.forEach((field) => {
      cy.get(TIMELINE_FIELD(field)).should('have.text', expectedFields[field]);
    });
  });

  it('Displays persisted enrichments on the JSON view', () => {
    const expectedEnrichment = [
      { line: 4, text: '  "threat": {' },
      {
        line: 3,
        text:
          '    "indicator": "{\\"first_seen\\":\\"2021-03-10T08:02:14.000Z\\",\\"file\\":{\\"size\\":80280,\\"pe\\":{},\\"type\\":\\"elf\\",\\"hash\\":{\\"sha256\\":\\"a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3\\",\\"tlsh\\":\\"6D7312E017B517CC1371A8353BED205E9128223972AE35302E97528DF957703BAB2DBE\\",\\"ssdeep\\":\\"1536:87vbq1lGAXSEYQjbChaAU2yU23M51DjZgSQAvcYkFtZTjzBht5:8D+CAXFYQChaAUk5ljnQssL\\",\\"md5\\":\\"9b6c3518a91d23ed77504b5416bfb5b3\\"}},\\"type\\":\\"file\\",\\"event\\":{\\"reference\\":\\"https://urlhaus-api.abuse.ch/v1/download/a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3/\\",\\"ingested\\":\\"2021-03-10T14:51:09.809069Z\\",\\"created\\":\\"2021-03-10T14:51:07.663Z\\",\\"kind\\":\\"enrichment\\",\\"module\\":\\"threatintel\\",\\"category\\":\\"threat\\",\\"type\\":\\"indicator\\",\\"dataset\\":\\"threatintel.abusemalware\\"},\\"matched\\":{\\"atomic\\":\\"a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3\\",\\"field\\":\\"myhash.mysha256\\",\\"id\\":\\"84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f\\",\\"index\\":\\"filebeat-7.12.0-2021.03.10-000001\\",\\"type\\":\\"indicator_match_rule\\"}}"',
      },
      { line: 2, text: '  }' },
    ];

    expandFirstAlert();
    openJsonView();
    scrollJsonViewToBottom();

    cy.get(JSON_LINES).then((elements) => {
      const length = elements.length;
      expectedEnrichment.forEach((enrichment) => {
        cy.wrap(elements)
          .eq(length - enrichment.line)
          .should('have.text', enrichment.text);
      });
    });
  });

  it('Displays threat indicator details on the threat intel tab', () => {
    const expectedThreatIndicatorData = [
      { field: 'event.category', value: 'threat' },
      { field: 'event.created', value: '2021-03-10T14:51:07.663Z' },
      { field: 'event.dataset', value: 'threatintel.abusemalware' },
      { field: 'event.ingested', value: '2021-03-10T14:51:09.809069Z' },
      { field: 'event.kind', value: 'enrichment' },
      { field: 'event.module', value: 'threatintel' },
      {
        field: 'event.reference',
        value:
          'https://urlhaus-api.abuse.ch/v1/download/a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3/(opens in a new tab or window)',
      },
      { field: 'event.type', value: 'indicator' },
      { field: 'file.hash.md5', value: '9b6c3518a91d23ed77504b5416bfb5b3' },
      {
        field: 'file.hash.sha256',
        value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
      },
      {
        field: 'file.hash.ssdeep',
        value: '1536:87vbq1lGAXSEYQjbChaAU2yU23M51DjZgSQAvcYkFtZTjzBht5:8D+CAXFYQChaAUk5ljnQssL',
      },
      {
        field: 'file.hash.tlsh',
        value: '6D7312E017B517CC1371A8353BED205E9128223972AE35302E97528DF957703BAB2DBE',
      },
      { field: 'file.size', value: '80280' },
      { field: 'file.type', value: 'elf' },
      { field: 'first_seen', value: '2021-03-10T08:02:14.000Z' },
      {
        field: 'matched.atomic',
        value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
      },
      { field: 'matched.field', value: 'myhash.mysha256' },
      {
        field: 'matched.id',
        value: '84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f',
      },
      { field: 'matched.index', value: 'filebeat-7.12.0-2021.03.10-000001' },
      { field: 'matched.type', value: 'indicator_match_rule' },
      { field: 'type', value: 'file' },
    ];

    expandFirstAlert();
    openThreatIndicatorDetails();

    cy.get(THREAT_INTEL_TAB).should('have.text', 'Threat Intel (1)');
    cy.get(THREAT_DETAILS_VIEW).within(() => {
      cy.get(TABLE_ROWS).should('have.length', expectedThreatIndicatorData.length);
      expectedThreatIndicatorData.forEach((row, index) => {
        cy.get(TABLE_ROWS)
          .eq(index)
          .within(() => {
            cy.get(TABLE_CELL).eq(0).should('have.text', row.field);
            cy.get(TABLE_CELL).eq(1).should('have.text', row.value);
          });
      });
    });
  });

  describe('with additional indicators', () => {
    before(() => {
      esArchiverLoad('threat_indicator2');
    });

    after(() => {
      esArchiverUnload('threat_indicator2');
    });

    it('Displays matched fields from both indicator match rules and investigation time enrichments on Alerts Summary tab', () => {
      const indicatorMatchRuleEnrichment = {
        field: 'myhash.mysha256',
        value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
      };
      const investigationTimeEnrichment = {
        field: 'source.ip',
        value: '192.168.1.1',
      };
      const expectedMatches = [indicatorMatchRuleEnrichment, investigationTimeEnrichment];

      expandFirstAlert();

      cy.get(THREAT_SUMMARY_VIEW).within(() => {
        cy.get(TABLE_ROWS).should('have.length', expectedMatches.length);
        expectedMatches.forEach((row, index) => {
          cy.get(TABLE_ROWS)
            .eq(index)
            .within(() => {
              cy.get(TITLE).should('have.text', row.field);
              cy.get(THREAT_CONTENT).should('have.text', row.value);
            });
        });
      });
    });
  });
});
