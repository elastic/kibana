/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializePathScript, cleanScript } from './ingest_pipeline_script_processor_helpers';

describe('Ingest Pipeline script processor helpers', () => {
  describe('initializePathScript', () => {
    it('initializes a single depth field', () => {
      expect(initializePathScript('someField')).toMatchInlineSnapshot(`
        "

                if (ctx.someField == null) {
                    ctx.someField = new HashMap();
                }
              "
      `);
    });

    it('initializes a multi depth field', () => {
      expect(initializePathScript('some.nested.field')).toMatchInlineSnapshot(`
        "

                if (ctx.some == null) {
                    ctx.some = new HashMap();
                }
              

                if (ctx.some.nested == null) {
                    ctx.some.nested = new HashMap();
                }
              

                if (ctx.some.nested.field == null) {
                    ctx.some.nested.field = new HashMap();
                }
              "
      `);
    });
  });

  describe('cleanScript', () => {
    it('removes duplicate empty lines and does basic indentation', () => {
      const mostlyCleanScript = `
        // This function will recursively collect all the values of a HashMap of HashMaps
        Collection collectValues(HashMap subject) {
          Collection values = new ArrayList();
          // Iterate through the values
          for(Object value: subject.values()) {
            // If the value is a HashMap, recurse
            if (value instanceof HashMap) {
              values.addAll(collectValues((HashMap) value));
            } else {
              values.add(String.valueOf(value));
            }
          }
          return values;
        }

        // Create the string builder
        StringBuilder entityId = new StringBuilder();

        if (ctx["entity"]["identity"] != null) {
          // Get the values as a collection
          Collection values = collectValues(ctx["entity"]["identity"]);

          // Convert to a list and sort
          List sortedValues = new ArrayList(values);
          Collections.sort(sortedValues);

          // Create comma delimited string
          for(String instanceValue: sortedValues) {
            entityId.append(instanceValue);
            entityId.append(":");
          }

          // Assign the slo.instanceId
          ctx["entity"]["id"] = entityId.length() > 0 ? entityId.substring(0, entityId.length() - 1) : "unknown";
        }
       `;

      expect(cleanScript(mostlyCleanScript)).toMatchInlineSnapshot(`
        "// This function will recursively collect all the values of a HashMap of HashMaps
        Collection collectValues(HashMap subject) {
          Collection values = new ArrayList();
          // Iterate through the values
          for(Object value: subject.values()) {
            // If the value is a HashMap, recurse
            if (value instanceof HashMap) {
              values.addAll(collectValues((HashMap) value));
            } else {
              values.add(String.valueOf(value));
            }
          }
          return values;
        }
        // Create the string builder
        StringBuilder entityId = new StringBuilder();
        if (ctx[\\"entity\\"][\\"identity\\"] != null) {
          // Get the values as a collection
          Collection values = collectValues(ctx[\\"entity\\"][\\"identity\\"]);
          // Convert to a list and sort
          List sortedValues = new ArrayList(values);
          Collections.sort(sortedValues);
          // Create comma delimited string
          for(String instanceValue: sortedValues) {
            entityId.append(instanceValue);
            entityId.append(\\":\\");
          }
          // Assign the slo.instanceId
          ctx[\\"entity\\"][\\"id\\"] = entityId.length() > 0 ? entityId.substring(0, entityId.length() - 1) : \\"unknown\\";
        }"
      `);

      const messyScript = `
        if (someThing) {

          ${initializePathScript('some.whatever')}

          ${initializePathScript('some.else.whatever')}

          ctx.some.thing.else = whatever;


          if (nothing) {

      more.stuff = otherStuff;

              }



        }
      `;
      expect(cleanScript(messyScript)).toMatchInlineSnapshot(`
        "if (someThing) {
          if (ctx.some == null) {
            ctx.some = new HashMap();
          }
          if (ctx.some.whatever == null) {
            ctx.some.whatever = new HashMap();
          }
          if (ctx.some == null) {
            ctx.some = new HashMap();
          }
          if (ctx.some.else == null) {
            ctx.some.else = new HashMap();
          }
          if (ctx.some.else.whatever == null) {
            ctx.some.else.whatever = new HashMap();
          }
          ctx.some.thing.else = whatever;
          if (nothing) {
            more.stuff = otherStuff;
          }
        }"
      `);
    });

    it('does not change any non white space character', () => {
      const mostlyCleanScript = `
        // This function will recursively collect all the values of a HashMap of HashMaps
        Collection collectValues(HashMap subject) {
          Collection values = new ArrayList();
          // Iterate through the values
          for(Object value: subject.values()) {
            // If the value is a HashMap, recurse
            if (value instanceof HashMap) {
              values.addAll(collectValues((HashMap) value));
            } else {
              values.add(String.valueOf(value));
            }
          }
          return values;
        }

        // Create the string builder
        StringBuilder entityId = new StringBuilder();

        if (ctx["entity"]["identity"] != null) {
          // Get the values as a collection
          Collection values = collectValues(ctx["entity"]["identity"]);

          // Convert to a list and sort
          List sortedValues = new ArrayList(values);
          Collections.sort(sortedValues);

          // Create comma delimited string
          for(String instanceValue: sortedValues) {
            entityId.append(instanceValue);
            entityId.append(":");
          }

          // Assign the slo.instanceId
          ctx["entity"]["id"] = entityId.length() > 0 ? entityId.substring(0, entityId.length() - 1) : "unknown";
        }
       `;

      function nonWhiteSpaceCharacters(string: string) {
        return string
          .split('')
          .filter((character) => character !== ' ' && character !== '\t' && character !== '\n')
          .join('');
      }

      expect(nonWhiteSpaceCharacters(cleanScript(mostlyCleanScript))).toEqual(
        nonWhiteSpaceCharacters(mostlyCleanScript)
      );
    });
  });
});
