/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '../../../../../../src/core/public';
import { DataType } from '../components/mappings_editor/types';
import { TYPE_DEFINITION } from '../components/mappings_editor/constants';

class DocumentationService {
  public setup(docLinks: DocLinksStart): void {
    const { ELASTICSEARCH_DOCS, links } = docLinks;
  }

  public getEsDocsBase() {
    return `${this.ELASTICSEARCH_DOCS}`;
  }

  public getSettingsDocumentationLink() {
    return this.links.elasticsearch.indexSettings;
  }

  public getMappingDocumentationLink() {
    return this.links.elasticsearch.mapping;
  }

  public getRoutingLink() {
    return this.links.elasticsearch.mappingRouting;
  }

  public getDataStreamsDocumentationLink() {
    return this.links.elasticsearch.dataStreams;
  }

  public getTemplatesDocumentationLink(isLegacy = false) {
    return isLegacy ? this.links.apis.putIndexTemplateV1 : this.links.elasticsearch.indexTemplates;
  }

  public getIdxMgmtDocumentationLink() {
    return this.links.management.indexManagement;
  }

  public getTypeDocLink = (type: DataType, docType = 'main'): string | undefined => {
    const typeDefinition = TYPE_DEFINITION[type];

    if (
      !typeDefinition ||
      !typeDefinition.documentation ||
      !typeDefinition.documentation[docType]
    ) {
      return undefined;
    }
    return `${this.esDocsBase}${typeDefinition.documentation[docType]}`;
  };
  public getDynamicMappingLink() {
    return this.links.elasticsearch.mappingDynamicFields;
  }
  public getPercolatorQueryLink() {
    return this.links.query.percolate;
  }

  public getRankFeatureQueryLink() {
    return this.links.elasticsearch.mappingRankFeatureFields;
  }

  public getMetaFieldLink() {
    return this.links.elasticsearch.mappingMetaFields;
  }

  public getDynamicTemplatesLink() {
    return this.links.elasticsearch.mappingDynamicTemplates;
  }

  public getMappingSourceFieldLink() {
    return this.links.elasticsearch.mappingSourceFields;
  }

  public getDisablingMappingSourceFieldLink() {
    return this.links.elasticsearch.mappingSourceFieldsDisable;
  }

  public getNullValueLink() {
    return this.links.elasticsearch.mappingNullValue;
  }

  public getTermVectorLink() {
    return this.links.elasticsearch.mappingTermVector;
  }

  public getStoreLink() {
    return this.links.elasticsearch.mappingStore;
  }

  public getSimilarityLink() {
    return this.links.elasticsearch.mappingSimilarity;
  }

  public getNormsLink() {
    return this.links.elasticsearch.mappingNorms;
  }

  public getIndexLink() {
    return this.links.elasticsearch.mappingIndex;
  }

  public getIgnoreMalformedLink() {
    return this.links.elasticsearch.mappingIgnoreMalformed;
  }

  public getMetaLink() {
    return this.links.elasticsearch.mappingMeta;
  }

  public getFormatLink() {
    return this.links.elasticsearch.mappingFormat;
  }

  public getEagerGlobalOrdinalsLink() {
    return this.links.elasticsearch.mappingEagerGlobalOrdinals;
  }

  public getDocValuesLink() {
    return this.links.elasticsearch.mappingDocValues;
  }

  public getCopyToLink() {
    return this.links.elasticsearch.mappingCopyTo;
  }

  public getCoerceLink() {
    return this.links.elasticsearch.mappingCoerce;
  }

  public getNormalizerLink() {
    return this.links.elasticsearch.mappingNormalizer;
  }

  public getIgnoreAboveLink() {
    return this.links.elasticsearch.mappingIgnoreAbove;
  }

  public getFielddataLink() {
    return this.links.elasticsearch.mappingFieldData;
  }

  public getFielddataFrequencyLink() {
    return this.links.elasticsearch.mappingFieldDataFilter;
  }

  public getEnablingFielddataLink() {
    return this.links.elasticsearch.mappingFieldDataEnable;
  }

  public getIndexPhrasesLink() {
    return this.links.elasticsearch.mappingIndexPhrases;
  }

  public getIndexPrefixesLink() {
    return this.links.elasticsearch.mappingIndexPrefixes;
  }

  public getPositionIncrementGapLink() {
    return this.links.elasticsearch.mappingPositionIncrementGap;
  }

  public getAnalyzerLink() {
    return this.links.elasticsearch.mappingAnalyzer;
  }

  public getDateFormatLink() {
    return this.links.elasticsearch.mappingFormat;
  }

  public getIndexOptionsLink() {
    return this.links.elasticsearch.mappingIndexOptions;
  }

  public getAlternativeToMappingTypesLink() {
    return this.links.elasticsearch.mappingTypesRemoval;
  }

  public getJoinMultiLevelsPerformanceLink() {
    return this.links.elasticsearch.mappingJoinFieldsPerformance;
  }

  public getDynamicLink() {
    return this.links.elasticsearch.mappingDynamic;
  }

  public getEnabledLink() {
    return this.links.elasticsearch.mappingEnabled;
  }

  public getWellKnownTextLink() {
    return 'http://docs.opengeospatial.org/is/12-063r5/12-063r5.html';
  }

  public getRootLocaleLink() {
    return 'https://docs.oracle.com/javase/8/docs/api/java/util/Locale.html#ROOT';
  }
}

export const documentationService = new DocumentationService();
