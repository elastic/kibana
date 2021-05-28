/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IndexParams {
  /** @example '.alerts' */
  indexPrefix: string;

  /** @example 'security', 'security.alerts', 'observability.events' */
  logName: string;

  /** @example 'default' */
  kibanaSpaceId: string;
}

export interface IndexNames extends IndexParams {
  /** @example '.alerts-security.alerts' */
  indexBaseName: string;

  /** @example '.alerts-security.alerts-*' */
  indexBasePattern: string;

  /** @example '.alerts-security.alerts-default' */
  indexAliasName: string;

  /** @example '.alerts-security.alerts-default-*' */
  indexAliasPattern: string;

  /** @example '.alerts-security.alerts-default-policy' */
  indexIlmPolicyName: string;

  /** @example '.alerts-security.alerts-default-template' */
  indexTemplateName: string;

  /** @example '.alerts-security.alerts-default-000001' */
  indexInitialName: string;
}

export abstract class IndexNames {
  public static create(params: IndexParams): IndexNames {
    const { indexPrefix, logName, kibanaSpaceId } = params;

    // TODO: validate params

    const indexBaseName = joinWithDash(indexPrefix, logName);
    const indexBasePattern = joinWithDash(indexPrefix, logName, '*');
    const indexAliasName = joinWithDash(indexPrefix, logName, kibanaSpaceId);
    const indexAliasPattern = joinWithDash(indexPrefix, logName, kibanaSpaceId, '*');
    const indexIlmPolicyName = joinWithDash(indexPrefix, logName, kibanaSpaceId, 'policy');
    const indexTemplateName = joinWithDash(indexPrefix, logName, kibanaSpaceId, 'template');
    const indexInitialName = joinWithDash(indexPrefix, logName, kibanaSpaceId, '000001');

    return {
      indexPrefix,
      logName,
      kibanaSpaceId,
      indexBaseName,
      indexBasePattern,
      indexAliasName,
      indexAliasPattern,
      indexIlmPolicyName,
      indexTemplateName,
      indexInitialName,
    };
  }

  public static createChild(parent: IndexNames, logName: string): IndexNames {
    return this.create({
      indexPrefix: parent.indexPrefix,
      logName: this.createChildLogName(parent.logName, logName),
      kibanaSpaceId: parent.kibanaSpaceId,
    });
  }

  public static createChildLogName(parentLogName: string, logName: string): string {
    return joinWithDot(parentLogName, logName);
  }
}

const joinWithDash = (...names: string[]): string => names.join('-');
const joinWithDot = (...names: string[]): string => names.join('.');
