import { type UnflattenedKnownFields, type FlattenedApmEvent, type MapToSingleOrMultiValue } from './utility_types';
type RequiredApmFields<T extends Partial<FlattenedApmEvent>, R extends keyof FlattenedApmEvent = never> = Partial<T> & Required<Pick<T, R>>;
/**
 * A Proxied APM document that is strongly typed and runtime checked to be correct.
 * Accessing fields from the document will correctly return single or multi values
 * according to known field types.
 */
export type ProxiedApmEvent<T extends Partial<FlattenedApmEvent>, R extends keyof FlattenedApmEvent = never> = Readonly<MapToSingleOrMultiValue<RequiredApmFields<T, R>>>;
/**
 * Interface for exposing the `unflatten()` and `requireFields()` methods on proxied APM documents.
 */
interface ApmDocumentMethods<T extends Partial<FlattenedApmEvent>, R extends keyof FlattenedApmEvent = never> {
    /**
     * Creates a new unproxied object with all the fields values extracted into their single or
     * multi-value form. The new object no longer grants access to proxied methods.
     */
    build(): MapToSingleOrMultiValue<RequiredApmFields<T, R>>;
    /**
     * Unflattens the APM Event, so fields can be accessed via `event.service?.name`.
     *
     * ```ts
     * const unflattened = accessKnownApmEventFields(hit, ['service.name']).unflatten();
     *
     * console.log(unflattened.service.name); // outputs "node-svc" for example
     * ```
     */
    unflatten(): UnflattenedKnownFields<RequiredApmFields<T, R>>;
    /**
     * Evaluates the APM Event with a set of required fields, throwing an error if
     * the event is invalid, or returning the document if valid, but now type-checked to
     * include the provided required fields.
     */
    requireFields<K extends keyof FlattenedApmEvent = never>(fields: K[]): ApmDocument<T, R | K>;
    /**
     * Evaluates whether any field matches the input string partially or fully and if those that
     * do match have a value present.
     */
    containsFields(fields: string): boolean;
}
/**
 * An APM document that is strongly typed and runtime checked to be correct.
 * Accessing fields from the document will correctly return single or multi values
 * according to known field types.
 *
 * An `unflatten()` method is also exposed by this document to return an unflattened
 * version of the document.
 */
export type ApmDocument<T extends Partial<FlattenedApmEvent>, R extends keyof FlattenedApmEvent = never> = ProxiedApmEvent<T, R> & ApmDocumentMethods<T, R>;
/**
 * Validates an APM Event document, checking if it has all the required fields if provided,
 * returning a proxied version of the document to allow strongly typed access to known single
 * or multi-value fields. The proxy also exposes an `unflatten()` method to return an unflattened
 * version of the document.
 *
 * ## Example
 *
 * ```ts
 * const event = accessKnownApmEventFields(hit).requireFields(['service.name']);
 *
 * // The key is strongly typed to be `keyof FlattenedApmEvent`.
 * console.log(event['service.name']) // => outputs `"node-svc"`, not `["node-svc"]` as in the original doc
 *
 * const unflattened = event.unflatten();
 *
 * console.log(unflattened.service.name); // => outputs "node-svc" like above
 */
export declare function accessKnownApmEventFields<T extends Partial<FlattenedApmEvent>>(fields: T): ApmDocument<T, never>;
export {};
