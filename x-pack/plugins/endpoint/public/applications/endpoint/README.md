# Endpoint application
This application provides the user interface for the Elastic Endpoint

# Architecture
The application consists of a _view_ written in React and a _model_ written in Redux.

# Modules
We structure the modules to match the architecture. `view` contains the _view_ (all React) code. `store` contains the _model_.

This section covers the conventions of each top level module.

# `mocks`
This contains helper code for unit tests.

## `models`
This contains domain models. By convention, each submodule here contains methods for a single type. Domain model classes would also live here.

## `store`
This contains the _model_ of the application. All Redux and Redux middleware code (including API interactions) happen here. This module also contains the types and interfaces defining Redux actions. Each action type or interface should be commented and if it has fields, each field should be commented. Comments should be of `tsdoc` style.

## `view`
This contains the code which renders elements to the DOM. All React code goes here.

## `index.tsx`
This exports `renderApp` which instantiates the React view with the _model_.

## `types.ts`
This contains the types and interfaces. All `export`ed types or interfaces (except ones defining Redux actions, which live in `store`) should be here. Each type or interface should have a `tsdoc` style comment. Interfaces should have `tsdoc` comments on each field and types which have fields should do the same.
