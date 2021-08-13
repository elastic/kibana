interface Login {
    path?: string;
    username?: string;
    password?: string;
}
export declare const login: ({ path, ...args }?: Login) => void;
export {};
