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
  private links: DocLinksStart['links'] | undefined;

  private dataStreams: string = '';
  private esDocsBase: string = '';
  private indexManagement: string = '';
  private indexSettings: string = '';
  private indexTemplates: string = '';
  private indexV1: string = '';
  private mapping: string = '';
  private mappingAnalyzer: string = '';
  private mappingCoerce: string = '';
  private mappingCopyTo: string = '';
  private mappingDocValues: string = '';
  private mappingDynamic: string = '';
  private mappingDynamicFields: string = '';
  private mappingDynamicTemplates: string = '';
  private mappingEagerGlobalOrdinals: string = '';
  private mappingEnabled: string = '';
  private mappingFieldData: string = '';
  private mappingFieldDataFilter: string = '';
  private mappingFieldDataTypes: string = '';
  private mappingFieldDataEnable: string = '';
  private mappingFormat: string = '';
  private mappingIgnoreAbove: string = '';
  private mappingIgnoreMalformed: string = '';
  private mappingIndex: string = '';
  private mappingIndexOptions: string = '';
  private mappingIndexPhrases: string = '';
  private mappingIndexPrefixes: string = '';
  private mappingJoinFieldsPerformance: string = '';
  private mappingMeta: string = '';
  private mappingMetaFields: string = '';
  private mappingNormalizer: string = '';
  private mappingNorms: string = '';
  private mappingNullValue: string = '';
  private mappingParameters: string = '';
  private mappingPositionIncrementGap: string = '';
  private mappingRankFeatureFields: string = '';
  private mappingRouting: string = '';
  private mappingSimilarity: string = '';
  private mappingSourceFields: string = '';
  private mappingSourceFieldsDisable: string = '';
  private mappingStore: string = '';
  private mappingTermVector: string = '';
  private mappingTypesRemoval: string = '';
  private percolate: string = '';
  private runtimeFields: string = '';

  public setup(docLinks: DocLinksStart): void {
    const { links } = docLinks;
    this.links = links;

    this.dataStreams = links.elasticsearch.dataStreams;
    this.esDocsBase = links.elasticsearch.docsBase;
    this.indexManagement = links.management.indexManagement;
    this.indexSettings = links.elasticsearch.indexSettings;
    this.indexTemplates = links.elasticsearch.indexTemplates;
    this.indexV1 = links.apis.putIndexTemplateV1;
    this.mapping = links.elasticsearch.mapping;
    this.mappingAnalyzer = links.elasticsearch.mappingAnalyzer;
    this.mappingCoerce = links.elasticsearch.mappingCoerce;
    this.mappingCopyTo = links.elasticsearch.mappingCopyTo;
    this.mappingDocValues = links.elasticsearch.mappingDocValues;
    this.mappingDynamic = links.elasticsearch.mappingDynamic;
    this.mappingDynamicFields = links.elasticsearch.mappingDynamicFields;
    this.mappingDynamicTemplates = links.elasticsearch.mappingDynamicTemplates;
    this.mappingEagerGlobalOrdinals = links.elasticsearch.mappingEagerGlobalOrdinals;
    this.mappingEnabled = links.elasticsearch.mappingEnabled;
    this.mappingFieldData = links.elasticsearch.mappingFieldData;
    this.mappingFieldDataTypes = links.elasticsearch.mappingFieldDataTypes;
    this.mappingFieldDataEnable = links.elasticsearch.mappingFieldDataEnable;
    this.mappingFieldDataFilter = links.elasticsearch.mappingFieldDataFilter;
    this.mappingFormat = links.elasticsearch.mappingFormat;
    this.mappingIgnoreAbove = links.elasticsearch.mappingIgnoreAbove;
    this.mappingIgnoreMalformed = links.elasticsearch.mappingIgnoreMalformed;
    this.mappingIndex = links.elasticsearch.mappingIndex;
    this.mappingIndexOptions = links.elasticsearch.mappingIndexOptions;
    this.mappingIndexPhrases = links.elasticsearch.mappingIndexPhrases;
    this.mappingIndexPrefixes = links.elasticsearch.mappingIndexPrefixes;
    this.mappingJoinFieldsPerformance = links.elasticsearch.mappingJoinFieldsPerformance;
    this.mappingMeta = links.elasticsearch.mappingMeta;
    this.mappingMetaFields = links.elasticsearch.mappingMetaFields;
    this.mappingNormalizer = links.elasticsearch.mappingNormalizer;
    this.mappingNorms = links.elasticsearch.mappingNorms;
    this.mappingNullValue = links.elasticsearch.mappingNullValue;
    this.mappingParameters = links.elasticsearch.mappingParameters;
    this.mappingPositionIncrementGap = links.elasticsearch.mappingPositionIncrementGap;
    this.mappingRankFeatureFields = links.elasticsearch.mappingRankFeatureFields;
    this.mappingRouting = links.elasticsearch.mappingRouting;
    this.mappingSimilarity = links.elasticsearch.mappingSimilarity;
    this.mappingSourceFields = links.elasticsearch.mappingSourceFields;
    this.mappingSourceFieldsDisable = links.elasticsearch.mappingSourceFieldsDisable;
    this.mappingStore = links.elasticsearch.mappingStore;
    this.mappingTermVector = links.elasticsearch.mappingTermVector;
    this.mappingTypesRemoval = links.elasticsearch.mappingTypesRemoval;
    this.percolate = links.query.percolate;
    this.runtimeFields = links.runtimeFields.overview;
  }

  public getEsDocsBase() {
    return this.esDocsBase;
  }

  public getSettingsDocumentationLink() {
    return this.indexSettings;
  }

  public getMappingDocumentationLink() {
    return this.mapping;
  }

  public getRoutingLink() {
    return this.mappingRouting;
  }

  public getDataStreamsDocumentationLink() {
    return this.dataStreams;
  }

  public getTemplatesDocumentationLink(isLegacy = false) {
    return isLegacy ? this.indexV1 : this.indexTemplates;
  }

  public getIdxMgmtDocumentationLink() {
    return this.indexManagement;
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
  public getMappingTypesLink() {
    return this.mappingFieldDataTypes;
  }
  public getDynamicMappingLink() {
    return this.mappingDynamicFields;
  }
  public getPercolatorQueryLink() {
    return this.percolate;
  }

  public getRankFeatureQueryLink() {
    return this.mappingRankFeatureFields;
  }

  public getMetaFieldLink() {
    return this.mappingMetaFields;
  }

  public getDynamicTemplatesLink() {
    return this.mappingDynamicTemplates;
  }

  public getMappingSourceFieldLink() {
    return this.mappingSourceFields;
  }

  public getDisablingMappingSourceFieldLink() {
    return this.mappingSourceFieldsDisable;
  }

  public getNullValueLink() {
    return this.mappingNullValue;
  }

  public getTermVectorLink() {
    return this.mappingTermVector;
  }

  public getStoreLink() {
    return this.mappingStore;
  }

  public getSimilarityLink() {
    return this.mappingSimilarity;
  }

  public getNormsLink() {
    return this.mappingNorms;
  }

  public getIndexLink() {
    return this.mappingIndex;
  }

  public getIgnoreMalformedLink() {
    return this.mappingIgnoreMalformed;
  }

  public getMetaLink() {
    return this.mappingMeta;
  }

  public getFormatLink() {
    return this.mappingFormat;
  }

  public getEagerGlobalOrdinalsLink() {
    return this.mappingEagerGlobalOrdinals;
  }

  public getDocValuesLink() {
    return this.mappingDocValues;
  }

  public getCopyToLink() {
    return this.mappingCopyTo;
  }

  public getCoerceLink() {
    return this.mappingCoerce;
  }

  public getBoostLink() {
    return this.mappingParameters;
  }

  public getNormalizerLink() {
    return this.mappingNormalizer;
  }

  public getIgnoreAboveLink() {
    return this.mappingIgnoreAbove;
  }

  public getFielddataLink() {
    return this.mappingFieldData;
  }

  public getFielddataFrequencyLink() {
    return this.mappingFieldDataFilter;
  }

  public getEnablingFielddataLink() {
    return this.mappingFieldDataEnable;
  }

  public getIndexPhrasesLink() {
    return this.mappingIndexPhrases;
  }

  public getIndexPrefixesLink() {
    return this.mappingIndexPrefixes;
  }

  public getPositionIncrementGapLink() {
    return this.mappingPositionIncrementGap;
  }

  public getAnalyzerLink() {
    return this.mappingAnalyzer;
  }

  public getDateFormatLink() {
    return this.mappingFormat;
  }

  public getIndexOptionsLink() {
    return this.mappingIndexOptions;
  }

  public getAlternativeToMappingTypesLink() {
    return this.mappingTypesRemoval;
  }

  public getJoinMultiLevelsPerformanceLink() {
    return this.mappingJoinFieldsPerformance;
  }

  public getDynamicLink() {
    return this.mappingDynamic;
  }

  public getEnabledLink() {
    return this.mappingEnabled;
  }

  public getRuntimeFields() {
    return this.runtimeFields;
  }

  public getWellKnownTextLink() {
    return 'http://docs.opengeospatial.org/is/12-063r5/12-063r5.html';
  }

  public getRootLocaleLink() {
    return 'https://docs.oracle.com/javase/8/docs/api/java/util/Locale.html#ROOT';
  }

  public get docLinks(): DocLinksStart['links'] {
    if (!this.links) {
      throw new Error(`Can't return undefined doc links.`);
    }
    return this.links;
  }
}

export const documentationService = new DocumentationService();
