export declare class ErrorWithStatusCode extends Error {
    readonly statusCode: string;
    constructor(message: string, statusCode: string);
}
