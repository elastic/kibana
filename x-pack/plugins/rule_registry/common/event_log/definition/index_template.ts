/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

type TemplateRequest = NonNullable<estypes.IndicesPutTemplateRequest['body']>;

export type Settings = NonNullable<TemplateRequest['settings']>;
export type Mappings = NonNullable<TemplateRequest['mappings']>;
export type Aliases = NonNullable<TemplateRequest['aliases']>;
export type Version = NonNullable<TemplateRequest['version']>;
export type Meta = Record<string, unknown>;

export interface TemplateOptions {
  settings?: Settings;
  mappings?: Mappings;
  aliases?: Aliases;
  version?: Version;
  meta?: Meta;
}

export type ComponentTemplateOptions = TemplateOptions;

export interface IndexTemplateOptions extends TemplateOptions {
  priority?: number;
}

/**
 * During index bootstrapping a number of templates will be created by the
 * Event Log mechanism. They will have a certain order of precedence and
 * the "next" template will override properties from all the "previous" ones.
 * Here's the list of templates from "start" (most generic, least precedence)
 * to "finish" (most specific, most precedence):
 *
 * 1. Mechanism-level `.alerts-mappings` component template. Specified
 *    internally by the Event Log mechanism. Contains index mappings common
 *    to all logs (observability alerts, security execution events, etc).
 * 2. Mechanism-level `.alerts-settings` component template. Specified
 *    internally by the Event Log mechanism. Contains index settings which
 *    make sense to all logs by default.
 * 3. Log-level `.alerts-{log.name}-app` application-defined component template.
 *    Specified and versioned externally by the application (plugin) which
 *    defines the log. Contains index mappings and/or settings specific to
 *    this particular log. This is the place where you as application developer
 *    can override or extend the default framework mappings and settings.
 * 4. Log-level `.alerts-{log.name}-user` user-defined component template.
 *    Specified internally by the Event Log mechanism, is empty, not versioned.
 *    By updating it, the user can override default mappings and settings.
 * 5. Log-level `.alerts-{log.name}-user-{spaceId}` user-defined space-aware
 *    component template. Specified internally by the Event Log mechanism,
 *    is empty, not versioned. By updating it, the user can override default
 *    mappings and settings of the log in a certain Kibana space.
 * 6. Log-level `.alerts-{log.name}-{spaceId}-template` index template.
 *    Its version and most of its options can be specified externally by the
 *    application (plugin) which defines the log. This is the place where you
 *    as application developer can override user settings. However, mind that
 *    the Event Log mechanism has the last word and injects some hard defaults
 *    into the final index template to make sure it works as it should.
 *
 * Template #6 overrides #5, which overrides #4, which overrides #3, etc.
 * More on composing multiple templates in the docs:
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-template.html#multiple-component-templates
 *
 * As a developer instantiating Templates, you are able to specify templates
 * #3 (applicationDefinedComponentTemplate) and optionally #6 (indexTemplate).
 * Start with setting application-defined component template options, it should
 * be enough in most cases. Specify index template options ONLY if you intend
 * to override user settings or mappings for whatever reason.
 */
export interface Templates {
  applicationDefinedComponentTemplate: ComponentTemplateOptions;
  indexTemplate?: IndexTemplateOptions;
}
