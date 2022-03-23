/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ScreenshotResult } from '../screenshots';

/**
 * A general, overridable type of screenshot result
 *
 * PDF or PNG screenshots should extend this and convert the output to a type
 * that best suits their use cases.
 *
 * This type documents what might appear on any given output type
 */
export type FormattedScreenshotResult = Omit<ScreenshotResult, 'layout'>;
