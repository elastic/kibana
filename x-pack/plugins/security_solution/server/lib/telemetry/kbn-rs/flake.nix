{
  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        packages = with pkgs; [
          cargo
          cargo-bloat
          cargo-edit
          cargo-outdated
          cargo-udeps
          cargo-watch
          clippy
          curl
          git
          jq
          napi-rs-cli
          openssl
          pkg-config
          rust-analyzer
          wget
          yarn
        ];
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = packages;

          env = {
            RUST_BACKTRACE = "1";
            RUSTUP_TOOLCHAIN = "stable";
          };
        };
      }
    );
}
