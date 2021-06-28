/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This field is used for authorization of the entities within the cases plugin. Each entity within Cases will have the owner field
 * set to a string that represents the plugin that "owns" (i.e. the plugin that originally issued the POST request to
 * create the entity) the entity.
 *
 * The Authorization class constructs a string composed of the operation being performed (createCase, getComment, etc),
 * and the owner of the entity being acted upon or created. This string is then given to the Security plugin which
 * checks to see if the user making the request has that particular string stored within it's privileges. If it does,
 * then the operation succeeds, otherwise the operation fails.
 *
 * APIs that create/update an entity require that the owner field be passed in the body of the request.
 * APIs that search for entities typically require that the owner be passed as a query parameter.
 * APIs that specify an ID of an entity directly generally don't need to specify the owner field.
 *
 * For APIs that create/update an entity, the RBAC implementation checks to see if the user making the request has the
 * correct privileges for performing that action (a create/update) for the specified owner.
 * This check is done through the Security plugin's API.
 *
 * For APIs that search for entities, the RBAC implementation creates a filter for the saved objects query that limits
 * the search to only owners that the user has access to. We also check that the objects returned by the saved objects
 * API have the limited owner scope. If we find one that the user does not have permissions for, we throw a 403 error.
 * The owner field that is passed in as a query parameter can be used to further limit the results. If a user attempts
 * to pass an owner that they do not have access to, the owner is ignored.
 *
 * For APIs that retrieve/delete entities directly using their ID, the RBAC implementation requests the object first,
 * and then checks to see if the user making the request has access to that operation and owner. If the user does, the
 * operation continues, otherwise we throw a 403.
 */
export const OWNER_FIELD = 'owner';
