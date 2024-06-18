/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWidgetFactory } from '@kbn/investigate-plugin/public';
import { NOTE_WIDGET_NAME } from '../../constants';
import type { NoteWidgetCreateParameters } from './types';

export const createNoteWidget = createWidgetFactory<NoteWidgetCreateParameters>(NOTE_WIDGET_NAME);
