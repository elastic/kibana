/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThreatIndicatorRule } from '../../objects/rule';
import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import {
  JSON_TEXT,
  TABLE_CELL,
  TABLE_ROWS,
  THREAT_DETAILS_VIEW,
  ENRICHMENT_COUNT_NOTIFICATION,
  INDICATOR_MATCH_ENRICHMENT_SECTION,
  INVESTIGATION_TIME_ENRICHMENT_SECTION,
  THREAT_DETAILS_ACCORDION,
} from '../../screens/alerts_details';
import { TIMELINE_FIELD } from '../../screens/rule_details';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { expandFirstAlert, setEnrichmentDates, viewThreatIntelTab } from '../../tasks/alerts';
import { createCustomIndicatorRule } from '../../tasks/api_calls/rules';
import { openJsonView, openThreatIndicatorDetails } from '../../tasks/alerts_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { addsFieldsToTimeline } from '../../tasks/rule_details';

describe('CTI Enrichment', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('threat_indicator');
    esArchiverLoad('suspicious_source_event');
    login();
    createCustomIndicatorRule(getNewThreatIndicatorRule());
  });

  after(() => {
    esArchiverUnload('threat_indicator');
    esArchiverUnload('suspicious_source_event');
  });

  beforeEach(() => {
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
  });

  it('Displays enrichment matched.* fields on the timeline', () => {
    const expectedFields = {
      'threat.enrichments.matched.atomic': getNewThreatIndicatorRule().atomic,
      'threat.enrichments.matched.type': getNewThreatIndicatorRule().matchedType,
      'threat.enrichments.matched.field': getNewThreatIndicatorRule().indicatorMappingField,
      'threat.enrichments.matched.id': getNewThreatIndicatorRule().matchedId,
      'threat.enrichments.matched.index': getNewThreatIndicatorRule().matchedIndex,
    };
    const fields = Object.keys(expectedFields) as Array<keyof typeof expectedFields>;

    addsFieldsToTimeline('threat.enrichments.matched', fields);

    fields.forEach((field) => {
      cy.get(TIMELINE_FIELD(field)).should('have.text', expectedFields[field]);
    });
  });

  it('Displays persisted enrichments on the JSON view', () => {
    const expectedEnrichment = [
      {
        feed: {
          name: 'AbuseCH malware',
        },
        indicator: {
          first_seen: '2021-03-10T08:02:14.000Z',
          file: {
            size: 80280,
            pe: {},
            type: 'elf',
            hash: {
              sha256: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
              tlsh: '6D7312E017B517CC1371A8353BED205E9128223972AE35302E97528DF957703BAB2DBE',
              ssdeep:
                '1536:87vbq1lGAXSEYQjbChaAU2yU23M51DjZgSQAvcYkFtZTjzBht5:8D+CAXFYQChaAUk5ljnQssL',
              md5: '9b6c3518a91d23ed77504b5416bfb5b3',
            },
          },
          type: 'file',
        },
        matched: {
          atomic: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
          field: 'myhash.mysha256',
          id: '84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f',
          index: 'logs-ti_abusech.malware',
          type: 'indicator_match_rule',
        },
      },
    ];

    expandFirstAlert();
    openJsonView();

    cy.get(JSON_TEXT).then((x) => {
      const parsed = JSON.parse(x.text());
      expect(parsed._source.threat.enrichments).to.deep.equal(expectedEnrichment);
    });
  });

  it('Displays threat indicator details on the threat intel tab', () => {
    const expectedThreatIndicatorData = [
      { field: 'feed.name', value: 'AbuseCH malware' },
      { field: 'indicator.file.hash.md5', value: '9b6c3518a91d23ed77504b5416bfb5b3' },
      {
        field: 'indicator.file.hash.sha256',
        value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
      },
      {
        field: 'indicator.file.hash.ssdeep',
        value: '1536:87vbq1lGAXSEYQjbChaAU2yU23M51DjZgSQAvcYkFtZTjzBht5:8D+CAXFYQChaAUk5ljnQssL',
      },
      {
        field: 'indicator.file.hash.tlsh',
        value: '6D7312E017B517CC1371A8353BED205E9128223972AE35302E97528DF957703BAB2DBE',
      },
      { field: 'indicator.file.size', value: '80280' },
      { field: 'indicator.file.type', value: 'elf' },
      { field: 'indicator.first_seen', value: '2021-03-10T08:02:14.000Z' },
      { field: 'indicator.type', value: 'file' },
      {
        field: 'matched.atomic',
        value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
      },
      { field: 'matched.field', value: 'myhash.mysha256' },
      {
        field: 'matched.id',
        value: '84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f',
      },
      { field: 'matched.index', value: 'logs-ti_abusech.malware' },
      { field: 'matched.type', value: 'indicator_match_rule' },
    ];

    expandFirstAlert();
    openThreatIndicatorDetails();

    cy.get(ENRICHMENT_COUNT_NOTIFICATION).should('have.text', '1');
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

    it('Displays matched fields from both indicator match rules and investigation time enrichments on Threat Intel tab', () => {
      const indicatorMatchRuleEnrichment = {
        field: 'myhash.mysha256',
        value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
        feedName: 'AbuseCH malware',
      };
      const investigationTimeEnrichment = {
        field: 'source.ip',
        value: '192.168.1.1',
        feedName: 'feed_name',
      };

      expandFirstAlert();
      viewThreatIntelTab();
      setEnrichmentDates('08/05/2018 10:00 AM');

      cy.get(`${INDICATOR_MATCH_ENRICHMENT_SECTION} ${THREAT_DETAILS_ACCORDION}`)
        .should('exist')
        .should(
          'have.text',
          `${indicatorMatchRuleEnrichment.field} ${indicatorMatchRuleEnrichment.value} from ${indicatorMatchRuleEnrichment.feedName}`
        );

      cy.get(`${INVESTIGATION_TIME_ENRICHMENT_SECTION} ${THREAT_DETAILS_ACCORDION}`)
        .should('exist')
        .should(
          'have.text',
          `${investigationTimeEnrichment.field} ${investigationTimeEnrichment.value} from ${investigationTimeEnrichment.feedName}`
        );
    });
  });
});
