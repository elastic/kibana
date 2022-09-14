/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from "@kbn/core-saved-objects-server";
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { isSerializedSearchSource } from '@kbn/data-plugin/common';
import { pick } from "lodash";
import { RawRule } from "../../../types";
import { createEsoMigration, isEsQueryRuleType, pipeMigrations } from "../utils";
